# FOREMAN — the enterprise loop (KG-centred), end to end via Maestro

The real use case of the blast-radius knowledge graph: assets live in **Data Fabric**, a worker
reports a fault, the **Maestro Case** investigates the fleet impact against the graph, a human
**approves in Action Center**, and on approval the graph **learns** — so the *next* report on a
sibling asset is handled smarter. No one runs commands; Maestro conducts published agents.

```
 Data Fabric (assets/sites/batches)                       Neo4j knowledge graph
        │  kg_sync (nightly trigger, MERGE)  ──────────►  structural backbone
        │                                                   ▲         │
   (worker report, simulated)                        grow  │         │ blast_radius + batch_intel
        ▼                                            (learn)│         ▼
 ┌─ MAESTRO CASE ───────────────────────────────────────────────────────────────┐
 │ 1 Intake      worker report → case data (caseId, assetId, siteId, failureMode) │
 │ 2 Diagnose    light step: confirm the reported failure mode (KG-centred stub)  │
 │ 3 Investigate KG agent (mode=investigate) → systemic? known_pattern? events ──►│──► UI live
 │ 4 Decide      Action Center approval task  ⏸ case suspends, waits for human     │
 │ 5 Act         on approval → dispatch / work order (Action Center / queue)       │
 │ 6 Close       KG agent (mode=close) → grow_graph  → graph LEARNS               │──► UI live
 └────────────────────────────────────────────────────────────────────────────────┘
        next report on a sibling asset → step 3 now returns known_pattern=true
```

This guide covers only what's needed for the KG-centred build. Vision/call are light stubs.

---

## Part 0 — One-time setup

**A. Data Fabric entities + mock data** — see `df_schema.md`. Create the 4 entities in the portal,
then:
```powershell
uipath auth                 # authenticate this machine to your tenant (one-time)
uv run python df_seed.py    # mock fleet into Data Fabric
uv run python kg_sync.py    # Data Fabric -> Neo4j (the backbone)
```
Put `kg_sync` on an Orchestrator **time trigger** (nightly) for production freshness.

**B. Assets** (Orchestrator → Shared → Assets): `Neo4j-Uri`, `Neo4j-User`, `Neo4j-Pass`,
`Neo4j-Database`, `Foreman-Backend-Url`, `Foreman-Ingest-Secret`. (No OpenAI — KG has no LLM.)

**C. Publish the KG agent** (Studio Web → Publish). It already does both modes
(`investigate` / `close`).

---

## Part 1 — The Maestro Case

Build in **Studio Web → Maestro → new Case**. Define case data, then stages.

**Case data**
| Variable | Example | Set at |
|----------|---------|--------|
| `caseId` | `CASE-0916` | Intake |
| `assetId` | `AST-RF-DEL-0473` | Intake (from report) |
| `siteId` | `DEL-0473` | Intake |
| `failureMode` | `connector_corrosion` | Diagnose |
| `confidence` | `0.9` | Diagnose |
| `systemic` / `knownPattern` / `affectedSites` / `batchId` | — | Investigate (from agent) |
| `approved` | `true/false` | Decide |
| `backendUrl` | from `Foreman-Backend-Url` Asset | Intake |

### Stage 1 — Intake (simulated worker report)
The "WhatsApp report" is modelled as a **structured report** that starts the case. Three ways,
pick one:
- **Manual start** in Maestro with the case-data inputs (simplest for a live demo).
- **API trigger**: `POST` to the Maestro/process start endpoint, or `sdk.processes.invoke(<case>,
  {caseId, assetId, siteId, …})`.
- **Form/queue**: an Action Center form or a queue item the case consumes.

Sample report payload (`worker_report.sample.json`):
```json
{ "caseId": "CASE-0916", "assetId": "AST-RF-DEL-0473", "siteId": "DEL-0473",
  "channel": "whatsapp", "text": "RF jumper looks corroded, intermittent signal",
  "media": "inbound/CASE-0916.mp4" }
```
Map its fields into the case data above. (When you later want real WhatsApp, swap this stage for
a Twilio/WhatsApp trigger via Integration Service — nothing downstream changes.)

### Stage 2 — Diagnose (KG-centred stub)
A light step that sets `failureMode` + `confidence` from the report. For the demo a constant
(`connector_corrosion`, `0.9`) is fine; later this becomes the Vision agent's root-cause output.

### Stage 3 — Investigate (KG agent — READ)
*Invoke agent → KG agent* (start & wait). Inputs:
`case_id←caseId, asset_id←assetId, site_id←siteId, mode="investigate", backend_url←backendUrl`.
Capture outputs into case data: `systemic, knownPattern←known_pattern, priorFailures←prior_failures,
affectedSites←affected_sites, batchId←batch_id, recommendation`.
The agent emits `stage.entered investigate`, `fleet.ready`, `agent.completed` → the UI **Fleet**
tab draws the blast-radius live. On a learned batch it also logs *"Graph memory: N confirmed
failures — recognised failure pattern."*

### Stage 4 — Decide (Action Center approval) ⏸
Gateway on `systemic`:
- `false` → single-site repair path (skip to Close).
- `true` → **Create Action Center approval task** ("Approve fleet review — batch {batchId},
  {affectedSites}"). Pass the recommendation + sites as the task data. **The case suspends and
  waits** for a human. The reviewer opens Action Center, sees the blast-radius summary, and
  **Approves/Rejects** → sets `approved`. *(This is your "human thumbs-up" — UiPath-native, with
  a full audit trail. The same verdict can be mirrored to the UI as a `feedback` event.)*

> In Maestro this is a built-in *Create Approval Task* / Action Center activity; the case
> instance is durable while it waits — hours or days is fine.

### Stage 5 — Act (dispatch)
On `approved == true`, create the work orders: an Action Center "dispatch" task, a queue item, or
an Integration-Service connector to your field-service system. (For the demo, a logged work order
is enough.)

### Stage 6 — Close (KG agent — LEARN)
*Invoke the **same** KG agent* with `mode="close", asset_id←assetId, failure_mode←failureMode,
confidence←confidence, case_id←caseId, backend_url←backendUrl`. This runs `grow_graph`: the asset
now `EXHIBITS` the failure, and once enough siblings on the batch fail, the batch flips to
`failure_pattern`. The agent emits `case.closed`. **The graph just learned.**

---

## Part 2 — The payoff: the next report is smarter

Run a **second** case on a sibling on the same batch (e.g. `AST-RF-MUM-0210`, then a third on
`AST-RF-KOC-0231`). After two Closes the batch crosses threshold; the next **Investigate** returns
`known_pattern=true`, `prior_failures≥2`, and the recommendation upgrades to
**"KNOWN failure pattern (N confirmed prior failures) — pre-empt all sites now."** That is the
blast-radius graph delivering compounding value: each resolved case makes the fleet response on
the next one faster and more confident.

> Demo tip: the failure-pattern threshold is `2` (a pattern needs ≥2 confirmations). To show the
> flip in just two cases, you can lower it to `1` where `grow_graph` is called.

---

## What runs where

| Concern | Mechanism |
|---------|-----------|
| Assets stored in the DB | **Data Fabric** entities (df_schema.md, df_seed.py) |
| DB → graph backbone | **kg_sync.py** on an Orchestrator time trigger (MERGE) |
| Worker report (WhatsApp) | simulated structured report → case start (Integration Service later) |
| Orchestration | **Maestro Case** invoking the published KG agent (no local commands) |
| Fleet reasoning (read) | KG agent `mode=investigate` → `blast_radius` + `batch_intel` |
| Human thumbs-up | **Action Center** approval task (case suspends/resumes) |
| Graph learning (write) | KG agent `mode=close` → `grow_graph` |
| Live UI | agents emit CaseEvents → view-backend → WebSocket → control-room UI |

The only code that ever runs is the **published agent**, invoked by Maestro. Everything you saw
locally (`uipath run …`) was just to prove each step; in production Maestro is the only caller.
