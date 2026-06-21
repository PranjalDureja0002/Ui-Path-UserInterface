# FOREMAN — Knowledge Graph (Neo4j), end-to-end

This is the *connection brain* of FOREMAN. The Vision agent answers **"what is wrong with
THIS asset?"**. The Knowledge-Graph agent answers the question that turns a repair into an
operations decision: **"what else is about to fail for the same reason?"**

It is deliberately **generic** — the graph models the *shape* of any field operation (assets
come from batches, sit at sites, belong to equipment classes, exhibit failure modes). RF
jumper cables are just the demo data; the same code serves injection-moulding machines,
transformers, pumps — without a line changed.

```
                 ┌──────────── Neo4j AuraDB (the graph) ────────────┐
   Data Fabric ─►│  (Asset)-[:FROM_BATCH]->(Batch)-[:SUPPLIED_BY]->(Vendor)
   (structural   │  (Asset)-[:LOCATED_AT]->(Site {environment,status})
    backbone)    │  (Asset)-[:OF_CLASS]->(EquipmentClass)
                 │  (Asset)-[:EXHIBITS]->(FailureMode)   ◄─ grown per closed case
                 └──────▲───────────────────────────────────┬─────────┘
                        │ blast_radius() READ                │ grow_graph() WRITE
              Investigate stage                        Close stage
                        │                                    │
                 ┌──────┴─────────── this agent (main.py) ───┴──────┐
   Maestro Case ►│  blast node → fleet.ready CaseEvent → UI Fleet tab │► Output(systemic…)
                 └───────────────────────────────────────────────────┘
```

---

## What "dynamically constructed" means here

The graph is **never hand-authored**. It is built and kept current by two automated flows:

1. **Structural backbone (sync).** A scheduled job mirrors your system-of-record (UiPath
   **Data Fabric** entities, or any CMDB) into Neo4j using `MERGE` — an idempotent upsert.
   Run it every night or on every Data-Fabric change; re-running never duplicates a node.
   `kg_seed.py` is a stand-in for that sync (same `MERGE` statements, hard-coded demo rows).

2. **Learned layer (grow-per-case).** Every time a case **closes**, FOREMAN writes the
   *confirmed* finding back: `(Asset)-[:EXHIBITS]->(FailureMode)`, the site is marked, and
   once enough siblings on one batch have failed the batch itself is flagged
   `failure_pattern`. That flag is what makes the **next** case smarter — the second corroded
   plug on a batch is recognised as systemic instantly. `kg_close.py` demonstrates this.

So the graph is a living thing: structure flows in from Data Fabric, judgement flows in from
closed cases. Nothing about it is RF-specific.

---

## The generic ontology

| Node | Key | Meaning |
|------|-----|---------|
| `Asset` | `asset_id` | A physical thing in the field |
| `Batch` | `batch_id` | A manufacturing/procurement lot; carries `status` (`healthy` → `failure_pattern`) |
| `Vendor` | `name` | Who supplied the batch |
| `Site` | `site_id` | Where the asset lives; carries `environment`, `cluster`, `status` |
| `Cluster` | `name` | Geographic/operational grouping of sites |
| `EquipmentClass` | `name` | The family (e.g. `rf_jumper_cable`) |
| `Component` | `name` | Part within the asset |
| `FailureMode` | `name` | A way things break (e.g. `connector_corrosion`) — **grown per case** |

Relationships: `FROM_BATCH`, `SUPPLIED_BY`, `LOCATED_AT`, `IN_CLUSTER`, `OF_CLASS`,
`HAS_COMPONENT`, `EXHIBITS {confidence, case_id, ts}`.

The **blast-radius** query needs *only the asset id*. Batch and environment are derived inside
Cypher, so the same traversal generalises to every equipment family with zero code change.

---

## Files in this folder

| File | Role |
|------|------|
| `kg.py` | Driver + the two Cypher operations (`blast_radius`, `grow_graph`) + `to_fleet_payload` for the UI |
| `main.py` | The LangGraph coded agent: `blast` node → `finalize` node; emits `fleet.ready` |
| `foreman_events.py` | Emits CaseEvents to the view-backend (live UI) |
| `kg_schema.cypher` | Uniqueness constraints (applied automatically by `kg_seed.py`; also pasteable into the Browser) |
| `kg_seed.py` | Stand-in for the Data-Fabric sync — applies constraints, seeds the demo fleet, verifies blast-radius |
| `kg_reset.py` | Wipe + re-seed to a pristine state between demo runs |
| `kg_close.py` | Demonstrates the Close-stage learning write |
| `input.json` | Sample agent input (`CASE-0916`, `AST-RF-DEL-0473`) |

---

## STEP 1 — Procure a Neo4j AuraDB Free instance

1. Go to **https://neo4j.com/cloud/aura-free/** → **Start Free** → sign in (Google works).
2. **Create instance** → choose **AuraDB Free** (no credit card; 1 free instance,
   200k nodes / 400k relationships — far more than this demo needs).
3. Pick a region near you, name it `foreman`, **Create**.
4. A panel shows the **Username** (`neo4j`) and a generated **Password** **once** — click
   **Download credentials** / copy the password now. You cannot see it again (you'd have to reset).
5. Wait ~1 min for status **Running**. Copy the **Connection URI** — it looks like
   `neo4j+s://xxxxxxxx.databases.neo4j.io` (the `+s` = TLS; keep it exactly).

When the instance is created it offers **Download credentials** — take it. You get a
`Neo4j-xxxxxxxx-Created-….txt` file that is already in `.env` format, e.g.:

```
NEO4J_URI=neo4j+s://948be272.databases.neo4j.io
NEO4J_USERNAME=948be272
NEO4J_PASSWORD=<your-aura-password>
NEO4J_DATABASE=948be272
```

> **Heads-up (2026 Aura):** newer AuraDB instances use the **instance id as both the username
> and the database name** (here `948be272`), *not* the old `neo4j`/`neo4j` convention. So just
> copy the values from the downloaded file verbatim — don't "fix" the username to `neo4j`.

---

## STEP 2 — Local credentials

Paste the **whole contents of the downloaded credentials file** into this folder's `.env`
(below `UIPATH_PROJECT_ID`). `kg.py` reads `NEO4J_URI`, `NEO4J_USERNAME` (or `NEO4J_USER`),
`NEO4J_PASSWORD`, and `NEO4J_DATABASE` — exactly the keys that file uses.

> `.env` is for **local** testing only. Never commit it. In the cloud the agent reads
> UiPath **Assets** instead (Step 6).

---

## STEP 3 — Seed (constraints are applied automatically)

`kg_seed.py` applies the uniqueness constraints (`kg_schema.cypher`, idempotent) **and** seeds
the demo fleet in one go — no Neo4j Browser step required. (You *can* still paste
`kg_schema.cypher` into the Aura **Query** console if you prefer.)

Seed the demo fleet and verify the traversal:

```powershell
uv run python kg_seed.py
```

Expected: it seeds 5 assets and prints the blast-radius from `AST-RF-DEL-0473` — the four
**coastal NG-BATCH-22** sites (DEL, MUM, GOA, KOC) and **not** the dry `BLR` / marine-grade batch.
That contrast is the whole point: same batch **and** same environment = systemic.

---

## STEP 4 — Run the agent locally (drives the UI live)

1. Start the view-backend (from the repo root, the FastAPI bridge) and the UI as before.
2. Run the agent:

```powershell
uv run uipath run agent --file input.json
```

You'll see `stage.entered`, `agent.running`, **`fleet.ready`** (the radial graph), and
`agent.completed` events POST to the backend — the UI **Fleet tab** lights up with the batch at
the centre, the vendor above it, the affected sites on the ring (origin = corroded, siblings =
at-risk). The agent's `Output` reports `systemic=true`, the affected sites, and a recommendation.

To point emits at a **public** backend (cloud demo), pass `backend_url` in `input.json`.

---

## STEP 5 — Demonstrate learning (Close stage)

```powershell
uv run python kg_close.py
```

This writes `AST-RF-DEL-0473 -[:EXHIBITS]-> connector_corrosion`, marks the site, and counts
failing siblings on the batch. Edit the asset id to MUM/GOA and re-run to watch the batch flip
to **`failure_pattern`** once it crosses the threshold (2). Re-run blast-radius afterwards and the
batch now reads as a known pattern — the graph got smarter from a closed case.

---

## STEP 6 — Cloud: publish + Assets + Maestro wiring

**Assets** (Orchestrator → your folder → Assets → Add). Create three so the published agent
needs no `.env`:

| Asset name | Type | Value (from the downloaded file) |
|------------|------|-------|
| `Neo4j-Uri` | Text | `neo4j+s://948be272.databases.neo4j.io` |
| `Neo4j-User` | Text | `948be272` (the `NEO4J_USERNAME` value — instance id on 2026 Aura) |
| `Neo4j-Pass` | Credential (or Text) | your password |
| `Neo4j-Database` | Text | `948be272` (the `NEO4J_DATABASE` value; omit only if it's `neo4j`) |

`kg.py` already resolves **env first, then these Assets** (`folder_path="Shared"` — change if
your Assets live elsewhere), and reads either a Text or Credential asset robustly.

**Publish**: this is a Studio Web Local Workspace project — it auto-syncs; publish the package
from Studio Web (or `uv run uipath pack` / `publish`). The graph variable is `./main.py:graph`.

**Maestro Case wiring** — at the **Investigate** stage, add a *Run coded agent* step that
**starts & waits for** this agent:

- **Input** ← case data: `case_id`, `asset_id` (the failing asset from the Vision agent /
  case), optional `site_id`, and `backend_url` (your public view-backend URL for the live UI).
- **Output** → branch on it: if `systemic == true`, route to the **fleet-review** path
  (escalate across `affected_sites`, pre-empt the at-risk ones, raise a batch action);
  else handle as an isolated one-off repair. `recommendation` is a ready-made human summary.

At the **Close** stage, call `grow_graph(...)` (a tiny coded step or activity) with the
confirmed `failure_mode` so the graph learns from the resolution.

---

## Troubleshooting

- **`CERTIFICATE_VERIFY_FAILED` / "self-signed certificate in certificate chain"** — a
  corporate TLS-inspecting proxy (Zscaler/Netskope) is re-signing the connection. `kg.py`
  calls `truststore.inject_into_ssl()` at import so the driver trusts the **Windows**
  certificate store (which holds your corporate root CA). If you ever hit this elsewhere,
  that's the fix — *not* downgrading to an unencrypted URI.
- **`AuthError` (Unauthorized)** — almost always a wrong **username or password**. On 2026
  Aura the username is the **instance id**, not `neo4j` — copy `NEO4J_USERNAME` from the
  downloaded file verbatim. If unsure, reset the password in the Aura console.
- **`ServiceUnavailable` / can't connect** — check the URI has `neo4j+s://` and the instance
  is **Running**; AuraDB Free *pauses after a few days idle*, resume it from the console.
- **Empty results after seeding** — the database name matters on 2026 Aura. Ensure
  `NEO4J_DATABASE` (local) or the `Neo4j-Database` Asset (cloud) is set to the instance id.
- **Blast-radius empty** — you haven't seeded, or the asset id doesn't match. Run `kg_seed.py`.
- **Agent runs but UI doesn't move** — the view-backend isn't reachable; check it's running and
  that `backend_url` (cloud) / localhost (local) is correct.
