# FOREMAN — Production Run Book (live in UiPath Studio Web + Maestro Case)

End-to-end: from a worker's tower video landing in a Storage Bucket → Maestro Case conducts
the Vision agent and the Knowledge-Graph agent → human approves in Action Center → the graph
learns on Close → the control-room UI updates **live** at every step.

```
                         ┌─────────────────────── UiPath Cloud ───────────────────────┐
 worker uploads mp4 ──►  Storage Bucket                                                │
                         │      │ (start trigger)                                      │
                         │      ▼                                                      │
                         │   MAESTRO CASE  (the conductor)                             │
                         │   Intake → Perceive/Diagnose → Investigate → Decide → Act → Close
                         │      │            │ Vision agent     │ KG agent   │ Action  │ grow │
                         │      │            │ (job)            │ (job)      │ Center  │ graph│
                         │      ▼            ▼                  ▼            ▼         ▼      │
                         │   each agent emits CaseEvents (HTTPS POST) ───────────────────────┼──┐
                         └─────────────────────────────────────────────────────────────────┘  │
   Neo4j AuraDB ◄── blast_radius / grow_graph (KG agent)                                        │
   (the graph)   ◄── nightly sync from Data Fabric (structural backbone)                        │
                                                                                                ▼
                         view-backend (FastAPI)  ──WebSocket fan-out──►  Control-room UI (browser)
                         POST /ingest/{case_id}                          live tabs update per event
                         public via cloudflared tunnel
```

There are **three independent live loops**, and they meet at the CaseEvent:
1. **Orchestration loop** — Maestro runs agents in order, passing each one's Output to the next.
2. **Graph loop** — the KG agent *reads* the graph (blast-radius) and, on Close, *writes* to it
   (grow). The graph's structural backbone is kept fresh by a Data Fabric → Neo4j sync.
3. **UI loop** — every agent emits CaseEvents to the view-backend, which pushes them over a
   WebSocket so the browser re-renders in real time.

---

## Inventory (what already exists)

| Piece | Where | Status |
|-------|-------|--------|
| Vision agent (perceive→diagnose) | `Vision-Agent-Coded/Solution/Agent` · project `ef0d3f3a-…` | published |
| Knowledge-Graph agent (blast-radius) | `knowledge-Agent/Solution/Agent` · project `96aa79f2-…` | built + verified live, ready to publish |
| view-backend (ingest + WebSocket) | `server/view_backend.py` | runs locally; needs public tunnel |
| Control-room UI (React/Vite) | repo root `src/` | live-ready (`VITE_FEED_MODE=live`) |
| Neo4j AuraDB | instance `948be272` | live (seeded) |
| CaseEvent contract | `src/types.ts` | the single seam |

---

## PHASE 1 — Tenant setup (one-time)

In **Orchestrator** (your Shared folder), create these resources.

**Assets** (Orchestrator → Shared → Assets → Add):

| Asset | Type | Value |
|-------|------|-------|
| `OpenAI-Key` | Credential | your **rotated** OpenAI key (the one shared in chat must be revoked) |
| `Neo4j-Uri` | Text | `neo4j+s://948be272.databases.neo4j.io` |
| `Neo4j-User` | Text | `948be272` |
| `Neo4j-Pass` | Credential | the AuraDB password |
| `Neo4j-Database` | Text | `948be272` |
| `Foreman-Backend-Url` | Text | your public view-backend URL (filled in Phase 2) |
| `Foreman-Ingest-Secret` | Credential | a shared secret (matches the backend's `x-foreman-secret`) |

> Both agents already resolve **env-first, then Asset**. Locally they read `.env`; in the cloud
> they read these Assets. No code change needed to switch environments.

**Storage Bucket** (Orchestrator → Shared → Buckets → Add): e.g. `foreman-media`. This is where
worker videos land. The Vision agent downloads from here by `bucket_name` + `media_path`.

**Access scope** for the agents: when publishing, grant the agent's process the Shared folder so
it can read Assets and the Bucket. (You already did this for the Vision agent.)

---

## PHASE 2 — Public event backend (so cloud agents → live UI)

Cloud agent jobs run inside UiPath and must POST CaseEvents to a **public** URL. Two options:

**A. Quick tunnel (demo)** — on your machine:
```powershell
# terminal 1 — the backend
cd c:\Users\durej\Downloads\LT-ToBE\server
uv run uvicorn view_backend:app --host 0.0.0.0 --port 8000
# terminal 2 — expose it
cloudflared tunnel --url http://localhost:8000
```
Copy the `https://<random>.trycloudflare.com` URL it prints. That is your public backend.
> The quick-tunnel URL **changes every restart**. Each time, update the `Foreman-Backend-Url`
> Asset (cloud) and the UI's `.env` `VITE_FEED_WS_URL` (Phase 6).

**B. Hosted (stable)** — deploy `server/view_backend.py` to Render/Railway/Fly for a fixed URL.
Better for a judged demo so the URL never changes. Set `Foreman-Backend-Url` to it once.

Verify: open `https://<url>/` — the backend should respond. The browser will connect to
`wss://<url>/ws`.

---

## PHASE 3 — Knowledge-graph backbone: Data Fabric → Neo4j sync

The graph has two layers (see `knowledge-Agent/.../KNOWLEDGE_GRAPH.md`):

- **Structural backbone** — assets, sites, batches, vendors. In production this is **synced from
  your system-of-record** (UiPath **Data Fabric** entities or a CMDB) into Neo4j with `MERGE`
  (idempotent upsert). This is the "syncing from Data Fabric" step.
- **Learned layer** — `EXHIBITS` failure modes and batch `failure_pattern` flags, written by the
  KG agent on Close (Phase 5).

**How the sync runs in prod:**
1. A small **sync process** (`kg_sync` — a coded process, same SDK) reads Data Fabric entities:
   `sdk.entities.list_records(<Assets/Sites/Batches/Vendors entity keys>)`.
2. For each record it runs the same `MERGE` Cypher as `kg_seed.py`, mapping entity columns →
   graph nodes/relationships. Because it's `MERGE`, re-running never duplicates.
3. It's attached to a **UiPath time trigger** (Orchestrator → Triggers → Time) — e.g. nightly,
   or on a Data-Fabric change event. That keeps Neo4j current as towers/batches change.

**For the live demo right now:** `kg_seed.py` *is* that sync (same `MERGE` statements, demo rows).
Your AuraDB is already seeded, so the backbone is in place. When you have real Data Fabric
entities, we promote `kg_seed.py` into `kg_sync.py` (swap the hard-coded rows for
`list_records`) and put it on a trigger — that's a ~30-line change.

> Net: **structure flows in from Data Fabric (sync), judgement flows in from closed cases (grow).**
> The graph is never hand-authored.

---

## PHASE 4 — Publish both coded agents

These are Studio Web Local Workspace projects (auto-sync via `.local/folder.lock`).

1. Open each project in **Studio Web** (it mirrors your local folder).
2. **Knowledge-Graph agent** — confirm `pyproject.toml` has `neo4j`, `truststore`, `httpx`;
   the entry point is `agent` (graph `./main.py:graph`). Click **Publish** → a package version
   lands in Orchestrator.
3. **Vision agent** — already published; re-publish if you changed anything.
4. In Orchestrator, confirm both appear as **Processes/Agents** in the Shared folder, and that
   each has access to the Assets + Bucket (Phase 1).

(You can smoke-test either in the cloud with a manual job before wiring the case.)

---

## PHASE 5 — Build the Maestro Case (the conductor)

In **Studio Web → Maestro → new Case** (guided visual build). Define **case data** (variables)
first, then stages.

**Case data (inputs):**
| Variable | Example | Source |
|----------|---------|--------|
| `caseId` | `CASE-0916` | generated at intake |
| `siteId` | `DEL-0473` | worker report |
| `assetId` | `AST-RF-DEL-0473` | worker report (the failing asset) |
| `bucketName` | `foreman-media` | constant |
| `mediaPath` | `inbound/CASE-0916.mp4` | the uploaded blob path |
| `backendUrl` | from `Foreman-Backend-Url` Asset | Phase 2 |

**Stages** (each stage's agent step is "start & wait for"):

1. **Intake** — capture/normalise the worker report into the case data above. (Trigger: file
   landing in the bucket, or a manual/API start. See Phase 7.)

2. **Perceive & Diagnose** — *Invoke agent → Vision agent*. Map inputs:
   `case_id←caseId, site_id←siteId, bucket_name←bucketName, media_path←mediaPath,
    text←workerText, backend_url←backendUrl`.
   Capture outputs into case data: `rootCause←root_cause, riskScore←risk_score,
    corrosion←corrosion_severity, issues←issues, visionRecommendation←recommendation`.
   *(The agent emits `stage.entered perceive/diagnose`, `agent.running/completed vision`,
   `frame.*` and `diagnosis.ready` CaseEvents → UI Perceive/Diagnose tabs light up live.)*

3. **Investigate (Fleet)** — *Invoke agent → Knowledge-Graph agent*. Map inputs:
   `case_id←caseId, asset_id←assetId, site_id←siteId, backend_url←backendUrl`.
   Capture outputs: `systemic←systemic, affectedSites←affected_sites,
    affectedCount←affected_count, batchId←batch_id, fleetRecommendation←recommendation`.
   *(Emits `stage.entered investigate`, `fleet.ready` → UI Fleet tab draws the blast-radius.)*

4. **Decide** — a **gateway** on `systemic`:
   - `systemic == true` → **Action Center approval task** ("Approve fleet review across N sites").
     Use *Create approval task* (Action Center) with the recommendation + affected sites as the
     payload. The case **waits** for the human decision.
   - `systemic == false` → route to a single-site repair task.

5. **Act / Dispatch** — on approval, create the work orders (Action Center task, a queue item,
   an email, or an Integration Service connector to your field-service system). For the demo, an
   Action Center "dispatch" task or a logged work-order is enough.

6. **Close & Learn** — a small *coded step* (or the KG agent in a "close" mode) calls
   `kg.grow_graph(asset_id, failure_mode, confidence, case_id, ts)` so the asset now `EXHIBITS`
   the confirmed failure and the batch flips to `failure_pattern` at threshold. Emit
   `stage.entered close` + `case.closed`. *(This is the learning write — the next case is smarter.)*

**Binding the public backend:** set `backendUrl` from the `Foreman-Backend-Url` Asset at Intake,
and pass it into every agent's `backend_url` input (above). That's how cloud jobs know where to
emit. (Alternatively, have `foreman_events` read the `Foreman-Backend-Url` Asset directly — say
the word and I'll add that fallback so you don't have to thread it through.)

---

## PHASE 6 — Point the UI at the live backend

In the repo root `.env`:
```
VITE_FEED_MODE=live
VITE_FEED_WS_URL=wss://<your-public-backend-host>/ws
```
(Use `wss://` for the cloudflared/hosted HTTPS URL; `ws://localhost:8000/ws` only for local.)
Rebuild/redeploy the UI (`npm run build` then host it, or `npm run dev` for the demo). On load it
opens the WebSocket and, on (re)connect, the backend replays a **snapshot** so a late-joining
browser catches up.

---

## PHASE 7 — Run it live

1. **Start the backend + tunnel** (Phase 2) and confirm the UI shows "connected".
2. **Upload a tower video** to the bucket as `mediaPath`:
   ```powershell
   cd c:\Users\durej\Downloads\LT-ToBE\Vision-Agent-Coded\Solution\Agent
   uv run uipath buckets files upload foreman-media "C:\path\to\clip.mp4" inbound/CASE-0916.mp4 --folder-path Shared
   ```
3. **Start the case** — from Maestro (Run) with the case data, or via a bucket-file trigger so it
   auto-starts on upload, or `sdk.processes.invoke(<case>, {...})`.
4. **Watch the UI** update stage by stage in real time:
   - Perceive → frames/corrosion appear.
   - Diagnose → root cause + confidence.
   - Investigate → the Fleet blast-radius graph (batch centre, affected sites).
   - Decide → an approval card; approve it in **Action Center**.
   - Act → dispatch logged.
   - Close → the graph learns; `case.closed`.
5. **Prove the learning** — run a *second* case on a sibling asset of the same batch; Investigate
   now reports it systemic immediately (batch already flagged). Use `kg_reset.py` to return to a
   pristine graph between demo runs.

---

## Deep-dive A — "syncing from Data Fabric" (the backbone flow)

```
Data Fabric entities            kg_sync (scheduled coded process)         Neo4j AuraDB
  Assets   ─┐                     for each record:                          (Asset)…(Batch)…
  Sites    ─┼─ list_records() ─►   MERGE (a:Asset {id})            ─────►   (Site)…(Vendor)
  Batches  ─┤                      MERGE (a)-[:FROM_BATCH]->(b)             idempotent upsert
  Vendors  ─┘                      MERGE (a)-[:LOCATED_AT]->(s) …           (no duplicates)
        ▲                                                                        │
        │ system-of-record changes (new tower, new batch)                       │ read by
        └───────────────── nightly / on-change trigger ────────────────────────►│ blast_radius()
```
- **What syncs:** the *structure* — which asset is on which batch, at which site/environment, by
  which vendor. Not failures (those are learned).
- **When:** a UiPath **time trigger** (nightly) or a Data-Fabric change event. Re-running is safe
  (`MERGE`).
- **Today:** `kg_seed.py` stands in for `kg_sync` with demo rows — your AuraDB is already seeded.

## Deep-dive B — "dynamic updation from UI" (the live-event flow)

```
KG/Vision agent (cloud job)
   emit(case_id, {kind:"fleet.ready", …})           ← one normalized CaseEvent
        │ HTTPS POST  /ingest/{case_id}  (x-foreman-secret)
        ▼
   view-backend (FastAPI)
        │ 1) appends to that case's event log (snapshot)
        │ 2) fans out to every connected WebSocket client
        ▼ wss://…/ws
   Browser (Zustand store)
        store.ingestEvent(evt)  →  React re-renders the matching tab
        (fleet.ready → Fleet graph; diagnosis.ready → Diagnose; log → activity feed)
   On (re)connect the backend replays the snapshot so a late browser catches up.
```
- **The seam is the CaseEvent** (`src/types.ts`). Replayed history, live cloud jobs, and local
  simulation all produce the *same* event shape, so the UI renders them identically.
- **No polling.** The agent pushes; the backend fans out; the browser reacts. Sub-second latency.
- **Why a backend at all:** cloud agent jobs can't reach a browser directly; the backend is the
  public ingress + the WebSocket hub + the snapshot store for reconnects.

---

## Operations & troubleshooting

- **Tunnel URL changed** → update the `Foreman-Backend-Url` Asset *and* the UI `.env`
  `VITE_FEED_WS_URL`, then restart the UI. (Use a hosted backend to avoid this.)
- **AuraDB paused** (Free tier pauses after days idle) → resume it in the Aura console before a run.
- **Agent job can't reach Neo4j from cloud** → it uses the `Neo4j-*` Assets; the corporate-proxy
  TLS fix (`truststore`) only matters on *your* machine — cloud Linux connects directly.
- **UI not updating** → check the agent's `backend_url` input is the public URL, the
  `Foreman-Ingest-Secret` matches, and the browser shows the WebSocket connected.
- **Rotate the OpenAI key** that was pasted in plaintext; keep it only in the `OpenAI-Key`
  Credential Asset; never commit any `.env` that contains it.
- **Reset the demo graph** between runs → `uv run python kg_reset.py`.
