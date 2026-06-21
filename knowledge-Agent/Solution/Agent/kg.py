"""FOREMAN Knowledge Graph (Neo4j) — generic, domain-agnostic.

The graph models the *shape* of field operations, not any one equipment family:
    (Asset)-[:FROM_BATCH]->(Batch)-[:SUPPLIED_BY]->(Vendor)
    (Asset)-[:LOCATED_AT]->(Site {environment, cluster, status})
    (Asset)-[:OF_CLASS]->(EquipmentClass)
    (Asset)-[:HAS_COMPONENT]->(Component)
    (Asset)-[:EXHIBITS {confidence, case_id, ts}]->(FailureMode)   ← grown per case

Two operations:
  • blast_radius(asset_id)  — READ at the Investigate stage (parameterized; no literals)
  • grow_graph(...)         — WRITE at the Close stage (MERGE the learned facts)

Credentials resolve env-first (local .env) then UiPath Assets (cloud):
    NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD   or   Assets  Neo4j-Uri / Neo4j-User / Neo4j-Pass
"""
import math
import os
from typing import Any

# Use the OS trust store (Windows) so TLS-inspecting corporate proxies that re-sign
# certs with an internal root CA are trusted — fixes AuraDB CERTIFICATE_VERIFY_FAILED.
try:
    import truststore

    truststore.inject_into_ssl()
except Exception:  # noqa: BLE001 — harmless if unavailable (e.g. cloud Linux)
    pass

from neo4j import GraphDatabase


def _creds() -> tuple[str, str, str]:
    uri = os.environ.get("NEO4J_URI")
    # Aura writes NEO4J_USERNAME; older guides use NEO4J_USER. AuraDB user is always 'neo4j'.
    user = os.environ.get("NEO4J_USERNAME") or os.environ.get("NEO4J_USER") or "neo4j"
    pwd = os.environ.get("NEO4J_PASSWORD")
    if not uri:
        from uipath.platform import UiPath  # imported lazily so local runs need no UiPath

        sdk = UiPath()

        def _asset(name: str) -> str:
            a = sdk.assets.retrieve(name, folder_path="Shared")
            return (
                getattr(a, "string_value", None)
                or getattr(a, "value", None)
                or getattr(a, "credential_password", None)
            )

        uri, user, pwd = _asset("Neo4j-Uri"), _asset("Neo4j-User"), _asset("Neo4j-Pass")
    return uri, user, pwd


def driver():
    uri, user, pwd = _creds()
    return GraphDatabase.driver(uri, auth=(user, pwd))


def database() -> str:
    # 2026 Aura instances name the default DB after the instance id; older ones use 'neo4j'.
    db = os.environ.get("NEO4J_DATABASE")
    if db:
        return db
    try:  # cloud: optional Asset, else fall back to the conventional default
        from uipath.platform import UiPath

        a = UiPath().assets.retrieve("Neo4j-Database", folder_path="Shared")
        return getattr(a, "string_value", None) or getattr(a, "value", None) or "neo4j"
    except Exception:  # noqa: BLE001
        return "neo4j"


# ── READ: generic blast-radius (only needs the asset id; batch + environment are
#         derived inside the traversal, so it works for any equipment family) ────
BLAST_RADIUS = """
MATCH (a:Asset {asset_id:$asset_id})-[:FROM_BATCH]->(b:Batch)
OPTIONAL MATCH (b)-[:SUPPLIED_BY]->(v:Vendor)
MATCH (a)-[:LOCATED_AT]->(asite:Site)
MATCH (b)<-[:FROM_BATCH]-(other:Asset)-[:LOCATED_AT]->(s:Site)
WHERE s.environment = asite.environment
RETURN DISTINCT other.asset_id AS asset_id, s.site_id AS site_id,
       s.environment AS environment, coalesce(s.status,'') AS status,
       b.batch_id AS batch_id, coalesce(b.status,'') AS batch_status,
       coalesce(v.name,'') AS vendor
ORDER BY site_id
"""


def blast_radius(asset_id: str) -> list[dict[str, Any]]:
    with driver() as d, d.session(database=database()) as ses:
        return ses.run(BLAST_RADIUS, asset_id=asset_id).data()


# ── READ: what has the graph already LEARNED about this asset's batch? ──────────
# This is what makes the *next* case smarter — it surfaces confirmed prior failures
# and whether the batch has crossed into a recognised failure pattern.
BATCH_INTEL = """
MATCH (a:Asset {asset_id:$asset_id})-[:FROM_BATCH]->(b:Batch)
OPTIONAL MATCH (b)<-[:FROM_BATCH]-(x:Asset)-[r:EXHIBITS]->(f:FailureMode)
RETURN b.batch_id AS batch_id, coalesce(b.status,'') AS batch_status,
       count(DISTINCT x) AS confirmed_failures,
       collect(DISTINCT f.name) AS failure_modes
"""


def batch_intel(asset_id: str) -> dict[str, Any]:
    with driver() as d, d.session(database=database()) as ses:
        rows = ses.run(BATCH_INTEL, asset_id=asset_id).data()
    r = rows[0] if rows else {}
    modes = [m for m in r.get("failure_modes", []) if m]
    return {
        "batch_id": r.get("batch_id", ""),
        "batch_status": r.get("batch_status", ""),
        "confirmed_failures": r.get("confirmed_failures", 0),
        "known_pattern": r.get("batch_status") == "failure_pattern",
        "failure_modes": modes,
    }


# ── WRITE: grow the graph from a closed case (MERGE = idempotent upsert) ────────
GROW = """
MATCH (a:Asset {asset_id:$asset_id})
MERGE (f:FailureMode {name:$failure_mode})
MERGE (a)-[r:EXHIBITS]->(f)
  SET r.confidence=$confidence, r.case_id=$case_id, r.ts=$ts
WITH a, f
MATCH (a)-[:LOCATED_AT]->(s:Site)  SET s.status='corroded'
WITH a, f
MATCH (a)-[:FROM_BATCH]->(b:Batch)
OPTIONAL MATCH (b)<-[:FROM_BATCH]-(sib:Asset)-[:EXHIBITS]->(f)
WITH b, count(DISTINCT sib) AS hits
SET b.status = CASE WHEN hits >= $threshold THEN 'failure_pattern'
                    ELSE coalesce(b.status,'healthy') END
RETURN b.batch_id AS batch_id, b.status AS status, hits
"""


def grow_graph(asset_id: str, failure_mode: str, confidence: float,
               case_id: str, ts: str, threshold: int = 2) -> list[dict[str, Any]]:
    with driver() as d, d.session(database=database()) as ses:
        return ses.run(GROW, asset_id=asset_id, failure_mode=failure_mode,
                       confidence=confidence, case_id=case_id, ts=ts,
                       threshold=threshold).data()


# ── Turn a blast-radius result into the UI's FleetGraph nodes/edges (radial) ────
def to_fleet_payload(rows: list[dict[str, Any]], origin_asset_id: str) -> dict[str, Any]:
    if not rows:
        return {"systemic": False, "affected": [], "nodes": [], "edges": []}

    batch_id = rows[0]["batch_id"]
    batch_status = rows[0]["batch_status"] or "failing"
    vendor = rows[0].get("vendor") or ""

    nodes: list[dict[str, Any]] = [{
        "id": batch_id, "label": batch_id, "type": "batch",
        "status": "failing" if batch_status in ("failing", "failure_pattern") else "healthy",
        "x": 50, "y": 50,
    }]
    edges: list[dict[str, Any]] = []
    if vendor:
        nodes.append({"id": vendor, "label": vendor, "type": "vendor", "x": 50, "y": 12})
        edges.append({"from": vendor, "to": batch_id, "rel": "SUPPLIED"})

    seen, sites = set(), []
    for r in rows:
        if r["site_id"] not in seen:
            seen.add(r["site_id"])
            sites.append(r)

    n = max(len(sites), 1)
    for i, r in enumerate(sites):
        theta = (2 * math.pi * i / n) - math.pi / 2
        x = round(50 + 34 * math.cos(theta), 1)
        y = round(58 + 30 * math.sin(theta), 1)
        origin = r["asset_id"] == origin_asset_id
        status = "corroded" if (origin or r["status"] in ("corroded", "affected")) else "at_risk"
        nodes.append({"id": r["site_id"], "label": r["site_id"], "type": "site",
                      "status": status, "x": x, "y": y})
        edges.append({"from": r["site_id"], "to": batch_id, "rel": "USES"})

    affected = [r["site_id"] for r in sites]
    return {"systemic": len(affected) >= 2, "affected": affected, "nodes": nodes, "edges": edges}
