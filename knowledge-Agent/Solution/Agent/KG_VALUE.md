# Why a knowledge graph — and not "just a Data Fabric query"

> *"This blast-radius is `SELECT sites WHERE batch = X AND environment = 'coastal'`. That's one
> SQL join. Why Neo4j? What does the graph actually buy you?"*

This is the **right** question to anticipate — and if the graph only ever did the single-batch
lookup, the judge would be correct. We answer in three moves: **(1) concede the trivial case,
(2) show a real case where SQL gives the WRONG answer, (3) prove the graph gets it right — live.**
Everything below is implemented in `kg.py` and runs against the AuraDB. Run it yourself:

```bash
uv run python kg_seed.py        # build the demo fleet (idempotent)
uv run python kg_why_graph.py   # the SQL-vs-graph contrast, on the same live case
```

## 1. The honest concession
One asset, one shared attribute (`batch`), one hop → yes, that's a relational `JOIN`. For *that
alone* you would not reach for a graph. Good. Now here's the case where that join breaks.

## 2. The case that breaks SQL — MC4 cross-mating (our live demo)
A field engineer sends a photo of a **burned MC4 solar connector** on string `AST-PV-RJ-S12`
(module batch `MOD-LOT-A`). The real failure cluster is **cross-mating**: an install crew mixed
two connector brands, and the bad joints span **three different module batches** but share **one
install crew** (`CREW-PV-3`) and **one connector lot** (`MC4-LOT-X`).

So a relational "same batch" query does not just under-perform — **it returns the wrong answer:**

```
[1] THE SKEPTIC'S QUERY -> SELECT assets WHERE batch = <this asset's batch>
      AST-PV-GJ-S19  batch=MOD-LOT-A  healthy
      AST-PV-MH-S05  batch=MOD-LOT-A  healthy
   -> 2 same-batch peers, 0 of which actually failed.
   -> It flags a HEALTHY string and MISSES every real burn (they're on other batches).
```

The graph, on the *same data*, traverses **every** failure-propagating factor and gets it right:

```
[2] MULTI-FACTOR blast-radius
      AST-PV-GJ-S03  [installed by=CREW-PV-3, uses part lot=MC4-LOT-X]
      AST-PV-RJ-S07  [installed by=CREW-PV-3, uses part lot=MC4-LOT-X]
      AST-PV-GJ-S22  [installed by=CREW-PV-3, uses part lot=MC4-LOT-X]
      AST-PV-GJ-S19  [from batch=MOD-LOT-A,  installed by=CREW-PV-3]
      AST-PV-RJ-S15  [installed by=CREW-PV-3]
      AST-PV-MH-S05  [from batch=MOD-LOT-A]            <- only the weak (batch) link

[3] COMMON-CAUSE of mc4_connector_burn
      Crew     CREW-PV-3   explains 2 prior failures
      PartLot  MC4-LOT-X   explains 2 prior failures   (module batch NEVER appears)

[4] CRITICALITY
      Crew     CREW-PV-3   6 assets exposed             <- harden / retrain here FIRST
```

The healthy control `MH-S05` shares `MOD-LOT-A` with the demo asset — which is *why* SQL flags it —
but the graph shows it shares **only** that one weak link, while the real cluster shares crew **and**
lot. The ranking sorts the 2-factor matches above the 1-factor false positive automatically.

## 3. Where a graph genuinely beats relational (the general principle)

**a) Blast-radius is propagation through a dependency NETWORK, not one column.** Assets co-fail
because they share *any* of many things: **batch**, **vendor**, **connector/part lot**, **install
crew**, **firmware**, **power feeder**, **cooling loop**, **network segment**. A fault spreads along
any edge. In Cypher that's one `-[r]->(f)<-[r2]-` over a list of factor types; in SQL it's a
different `JOIN` per relationship and a brittle, ever-growing schema.

**b) Variable, unknown depth.** "Everything within N hops of the failing feeder" is recursive. SQL
needs recursive CTEs or N self-joins where N isn't known ahead of time; graphs do variable-length
paths natively (`*1..4`).

**c) Common-cause inference.** Given several failures, *find the shared upstream node that explains
them* — the root, not the symptom. That's a lowest-common-ancestor / common-neighbour query. As §2
shows, on cross-mating it returns the crew + lot and **suppresses** the batch column SQL keyed on.

**d) Criticality ranking = proactive, not reactive.** "Which factor, if it went bad tomorrow, has
the **largest** blast-radius?" is degree/centrality over the dependency graph. Relational has no
PageRank. This flips FOREMAN from *reacting* to a fault to *ranking the single-points-of-failure to
harden first* — a board-level capability.

**e) A learned, accreting layer — this is a *knowledge* graph, not a lookup table.** Every closed
case writes back `(:Asset)-[:EXHIBITS {case_id, confidence, ts}]->(:FailureMode)` and flips a batch
to `failure_pattern` past a threshold. The graph becomes an evolving causal model that gets sharper
with every case. A SQL table doesn't *learn the topology*.

**f) The path IS the explanation (cited reasoning).** FOREMAN must be defensible. The graph returns
the *actual path* — `S12 → CREW-PV-3 ← S07, S03` — which drops straight into the audit pack as
evidence. A `SELECT` returns rows; a graph returns a **traversable rationale**.

**g) Horizontal product = schema that absorbs new domains.** An IMM shares a hydraulic manifold, a
tower a power feeder, a data centre a CRAC loop. New verticals bring new entity/edge types. A
graph's schema-optional model adds them with **zero migration**; a relational schema needs a redesign
per vertical. For a *horizontal* product that's architecture, not preference.

## 4. What's implemented (live in `kg.py`, not slideware)

| Capability | Function | Query type SQL can't match |
|------------|----------|----------------------------|
| Single-batch blast-radius (the clean opener) | `blast_radius()` | 1-hop join *(SQL can do this — we concede it)* |
| **Multi-factor blast-radius** | `multi_factor_blast_radius()` | traverse ANY of batch / lot / crew, report the why |
| **Common-cause** | `common_cause()` | shared upstream node across failures (root finder) |
| **Criticality ranking** | `criticality_ranking()` | degree centrality — proactive SPOF ranking |
| **Explainable path** | `blast_radius_paths()` | the path as audit evidence |
| Learned write-back on close | `grow_graph()` | accretes EXHIBITS edges + flips `failure_pattern` |

`FACTOR_RELS = [FROM_BATCH, USES_PART_LOT, INSTALLED_BY]` is the one list that makes blast-radius
multi-relationship; add `POWERED_BY` / `RUNS_FIRMWARE` / `COOLED_BY` for new verticals and every
query above inherits them for free. Criticality is **pure Cypher** (degree via `count()`), so it
needs no GDS plugin and runs on AuraDB-Free; swap in `gds.pageRank` at enterprise scale unchanged.

## 5. The 30-second answer to the judge
"For one shared batch, you're right — that's a join, and we don't pretend otherwise. But take our
actual case: a burned MC4 connector. The real fault is cross-mating — same install crew, same
connector lot, across **three different module batches**. Run the SQL 'same batch' query and it
returns two **healthy** strings and misses every real burn. Our graph, on the same data, traverses
crew and lot as well as batch, names the root cause as the crew, and ranks that crew as the
single-point-of-failure to fix first — and it returns the path as the audit evidence. That's not a
query you tune; it's a capability relational doesn't have. And it **learns**: every closed case
sharpens the next prediction."

## 6. Enterprise-readiness — how this is production-grade, not a demo hack

| Concern | How FOREMAN's KG handles it | Where |
|---------|----------------------------|-------|
| **Source of truth** | Data Fabric is the system of record; Neo4j is a *derived projection* rebuilt by sync — the graph can never silently drift, it's rebuildable from DF. | `kg_sync.py` |
| **Identity & idempotency** | Every write is `MERGE` on a unique business key + uniqueness constraints, so re-sync/re-seed never duplicates. | `kg_schema.cypher`, `kg_seed.py` |
| **Secrets & transport** | Credentials resolve env-first locally, **UiPath Assets** in cloud (never in code); TLS uses the OS trust store so corporate-proxy re-signing doesn't break Aura. | `kg._creds()`, `truststore` |
| **Multi-tenant / scale** | `database()` selects the tenant DB; AuraDB is managed/HA; centrality swaps from Cypher `count()` to GDS PageRank with no API change. | `kg.database()` |
| **Schema governance** | A documented *generic* ontology (Asset/Batch/Vendor/Site/Crew/PartLot/FailureMode) — horizontal by design; new verticals add edge types with zero migration. | `KNOWLEDGE_GRAPH.md` |
| **Provenance & audit** | Every learned edge carries `case_id`, `confidence`, `ts`; the blast-radius path is the cited evidence in the pack. | `grow_graph()`, `blast_radius_paths()` |
| **Governed learning loop** | The graph only grows on a **human-approved** case close (Action Center gate); a batch flips to `failure_pattern` only past a threshold, not on a single anecdote. | `main.py` close stage, `grow_graph(threshold)` |
| **Resilience / repeatable demo** | Additive, idempotent seed; a `kg_reset.py` to return to a pristine state; reads never mutate. | `kg_seed.py`, `kg_reset.py` |

## 7. How to land it in the room
Open with `blast_radius()` (instantly legible). The instant a judge says "isn't that just SQL?",
run `kg_why_graph.py` live: the SQL answer is wrong on screen, the graph answer is right, and the
criticality ranking turns a reactive fix into a proactive fleet program. That sequence turns the
*weakest* question into the *strongest* moment.
