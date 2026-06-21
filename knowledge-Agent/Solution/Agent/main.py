"""FOREMAN — Knowledge-Graph coded agent (read at Investigate, learn at Close).

Two modes, one published agent — selected by the `mode` input:

  • mode="investigate" (default) — blast-radius traversal of the Neo4j graph: given the
    failing asset, find everything that shares the failure-driving factors (same batch, same
    environment) → is this a systemic fleet pattern or an isolated fault? Drives the case branch.

  • mode="close" — grow_graph: write the confirmed finding back so the graph LEARNS — the asset
    now EXHIBITS the failure mode, and once enough siblings on a batch fail the batch is flagged
    'failure_pattern'. That makes the next case smarter.

Generic: the traversal is parameterized by the asset only (batch + environment are derived in
Cypher), so it serves any equipment family without code changes. Emits CaseEvents at each step
so the UI's Fleet tab lights up live.
"""
from datetime import datetime, timezone
from typing import Any

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

import kg
from foreman_events import configure, emit, log


# ── Agent I/O contract (the Maestro Case passes Input, consumes Output) ───────
class Input(BaseModel):
    case_id: str = Field(description="Maestro case id, e.g. CASE-0916")
    asset_id: str = Field(description="The failing asset, e.g. AST-RF-DEL-0473")
    site_id: str = Field(default="", description="Tower site id, e.g. DEL-0473")
    mode: str = Field(default="investigate", description="'investigate' (read) or 'close' (learn)")
    failure_mode: str = Field(default="connector_corrosion", description="Confirmed failure (close mode)")
    confidence: float = Field(default=0.9, description="Confidence of the confirmed failure (close mode)")
    backend_url: str = Field(default="", description="Public URL of the view-backend (cloud); empty = localhost")


class State(BaseModel):
    case_id: str = ""
    asset_id: str = ""
    site_id: str = ""
    mode: str = "investigate"
    failure_mode: str = "connector_corrosion"
    confidence: float = 0.9
    backend_url: str = ""
    fleet: dict[str, Any] = {}
    grew: dict[str, Any] = {}


class Output(BaseModel):
    systemic: bool = False
    affected_count: int = 0
    affected_sites: list[str] = []
    batch_id: str = ""
    batch_status: str = ""
    known_pattern: bool = False           # has the graph learned this batch is a failure pattern?
    prior_failures: int = 0               # confirmed failures already recorded on this batch
    recommendation: str = ""


# ── Router: pick the mode at the entry ────────────────────────────────────────
def route(state: State) -> str:
    return "close" if state.mode == "close" else "blast"


# ── Investigate (read) ────────────────────────────────────────────────────────
async def blast(state: State) -> dict[str, Any]:
    cid = state.case_id
    configure(state.backend_url)  # point emits at the public backend (cloud) when provided
    emit(cid, {"kind": "stage.entered", "stage": "investigate"})
    emit(cid, {"kind": "agent.running", "agent": "fleet"})
    log(cid, "investigate", "Fleet - Neo4j", "Blast-radius traversal on the knowledge graph")

    try:
        rows = kg.blast_radius(state.asset_id)
    except Exception as e:  # noqa: BLE001
        log(cid, "investigate", "Fleet - Neo4j", f"Knowledge graph unavailable: {e}", "warn")
        return {}

    payload = kg.to_fleet_payload(rows, state.asset_id)

    # What has the graph already LEARNED about this batch? (this is the "next case is
    # smarter" signal — confirmed prior failures + whether it's a known pattern)
    try:
        intel = kg.batch_intel(state.asset_id)
    except Exception:  # noqa: BLE001
        intel = {"confirmed_failures": 0, "known_pattern": False, "failure_modes": []}
    payload["prior_failures"] = intel["confirmed_failures"]
    payload["known_pattern"] = intel["known_pattern"]
    emit(cid, {"kind": "fleet.ready", "fleet": payload})

    if intel["confirmed_failures"] > 0:
        modes = ", ".join(intel["failure_modes"]) or "failures"
        log(cid, "investigate", "Fleet - Neo4j",
            f"Graph memory: this batch already has {intel['confirmed_failures']} confirmed "
            f"{modes}" + (" - recognised failure pattern." if intel["known_pattern"] else "."),
            "warn" if intel["known_pattern"] else "agent")

    batch = rows[0]["batch_id"] if rows else ""
    pat = " (known failure pattern)" if intel["known_pattern"] else ""
    headline = (f"Systemic - {len(payload['affected'])} sites on {batch}{pat}"
                if payload["systemic"] else "Isolated - no fleet pattern")
    emit(cid, {"kind": "agent.completed", "agent": "fleet", "run": {
        "headline": headline,
        "detail": ("Shares the failing batch in the same environment"
                   if payload["systemic"] else "No shared failing batch"),
        "confidence": 0.92, "citations": ["neo4j:blast-radius", "neo4j:batch-intel"]}})

    payload["batch_id"] = batch
    return {"fleet": payload}


async def finalize(state: State) -> Output:
    f = state.fleet or {}
    affected = f.get("affected", [])
    prior = f.get("prior_failures", 0)
    known = f.get("known_pattern", False)
    if f.get("systemic"):
        rec = (f"Systemic on batch {f.get('batch_id', '')} - escalate a fleet review across "
               f"{len(affected)} sites and pre-empt the at-risk ones.")
        if known:
            rec = (f"KNOWN failure pattern on batch {f.get('batch_id', '')} "
                   f"({prior} confirmed prior failures) - pre-empt all {len(affected)} sites now.")
    else:
        rec = "Isolated fault - handle as a one-off repair."
    return Output(systemic=f.get("systemic", False), affected_count=len(affected),
                  affected_sites=affected, batch_id=f.get("batch_id", ""),
                  known_pattern=known, prior_failures=prior, recommendation=rec)


# ── Close (learn) ─────────────────────────────────────────────────────────────
async def close(state: State) -> Output:
    cid = state.case_id
    configure(state.backend_url)
    emit(cid, {"kind": "stage.entered", "stage": "close"})
    log(cid, "close", "Fleet - Neo4j", f"Learning: {state.asset_id} exhibits {state.failure_mode}")

    ts = datetime.now(timezone.utc).isoformat()
    try:
        rows = kg.grow_graph(state.asset_id, state.failure_mode, state.confidence,
                             cid, ts, threshold=2)
    except Exception as e:  # noqa: BLE001
        log(cid, "close", "Fleet - Neo4j", f"Knowledge graph unavailable: {e}", "warn")
        return Output(recommendation=f"Close failed to write graph: {e}")

    r = rows[0] if rows else {}
    batch, status, hits = r.get("batch_id", ""), r.get("status", ""), r.get("hits", 0)
    learned = (f"Batch {batch} is now a recognised failure pattern ({hits} siblings)."
               if status == "failure_pattern"
               else f"Recorded on batch {batch}; {hits} sibling(s) so far - not yet a pattern.")
    emit(cid, {"kind": "agent.completed", "agent": "fleet", "run": {
        "headline": "Graph updated", "detail": learned,
        "confidence": state.confidence, "citations": ["neo4j:grow"]}})
    emit(cid, {"kind": "case.closed", "case_id": cid})
    return Output(batch_id=batch, batch_status=status, recommendation=learned)


# ── Graph ─────────────────────────────────────────────────────────────────────
builder = StateGraph(State, input=Input, output=Output)
builder.add_node("blast", blast)
builder.add_node("finalize", finalize)
builder.add_node("close", close)
builder.add_conditional_edges(START, route, {"blast": "blast", "close": "close"})
builder.add_edge("blast", "finalize")
builder.add_edge("finalize", END)
builder.add_edge("close", END)

graph = builder.compile()
