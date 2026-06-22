"""Seed the FOREMAN knowledge graph with a structural backbone, then verify the
blast-radius queries. Run once against your AuraDB after setting NEO4J_* in .env:

    uv run python kg_seed.py

The MERGE statements are idempotent (safe to re-run). The seed mirrors what a
real Data-Fabric -> Neo4j sync would create. The shape is generic; these rows are
the demo fleet.

Two demo clusters live in one graph:
  • RF / coastal  — the single-batch story (NG-BATCH-22), great as the *opening*.
  • PV / MC4 solar — the cross-mating story (the punch): the failures span THREE
    different module batches but share the same install crew + connector lot, so a
    batch query points at the WRONG thing and misses the real cluster. That is the
    case the graph wins and SQL cannot.

Every asset now carries THREE propagating factors, not one:
    (Asset)-[:FROM_BATCH]->(Batch)         build/module batch
    (Asset)-[:USES_PART_LOT]->(PartLot)    connector / spare-parts lot
    (Asset)-[:INSTALLED_BY]->(Crew)        the install crew (the cross-mating vector)
"""
import os

# load .env without python-dotenv
_HERE = os.path.dirname(os.path.abspath(__file__))
for _l in open(os.path.join(_HERE, ".env"), encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import kg  # noqa: E402

# (asset_id, equip_class, component, site_id, environment, cluster,
#  batch_id, batch_spec, batch_status, vendor, crew, part_lot, part_lot_status)
FLEET = [
    # ── RF / coastal cluster: the clean single-batch opener ──────────────────
    ("AST-RF-DEL-0473", "rf_jumper_cable", "jumper", "DEL-0473", "coastal", "WEST-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid", "CREW-RF-W", "NG-LOT-22", "genuine"),
    ("AST-RF-MUM-0210", "rf_jumper_cable", "jumper", "MUM-0210", "coastal", "WEST-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid", "CREW-RF-W", "NG-LOT-22", "genuine"),
    ("AST-RF-GOA-0188", "rf_jumper_cable", "jumper", "GOA-0188", "coastal", "WEST-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid", "CREW-RF-W", "NG-LOT-22", "genuine"),
    ("AST-RF-KOC-0231", "rf_jumper_cable", "jumper", "KOC-0231", "coastal", "SOUTH-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid", "CREW-RF-S", "NG-LOT-22", "genuine"),
    ("AST-RF-BLR-0337", "rf_jumper_cable", "jumper", "BLR-0337", "dry", "SOUTH-INLAND", "NG-BATCH-30", "marine-grade", "healthy", "NorthGrid", "CREW-RF-S", "NG-LOT-30", "genuine"),

    # ── PV / MC4 solar cluster: the cross-mating punch ───────────────────────
    # The demo asset. Burned MC4 connector. Module batch MOD-LOT-A.
    ("AST-PV-RJ-S12", "pv_string", "mc4_connector", "RJ-SOLAR-1", "hot-arid", "WEST-SOLAR", "MOD-LOT-A", "tier1-mono", "healthy", "SunVolt", "CREW-PV-3", "MC4-LOT-X", "cross_mated"),
    # Prior failures — DIFFERENT module batches, SAME crew + lot as the demo asset.
    ("AST-PV-RJ-S07", "pv_string", "mc4_connector", "RJ-SOLAR-1", "hot-arid", "WEST-SOLAR", "MOD-LOT-B", "tier1-mono", "healthy", "SunVolt", "CREW-PV-3", "MC4-LOT-X", "cross_mated"),
    ("AST-PV-GJ-S03", "pv_string", "mc4_connector", "GJ-SOLAR-2", "hot-arid", "WEST-SOLAR", "MOD-LOT-C", "tier1-mono", "healthy", "SunVolt", "CREW-PV-3", "MC4-LOT-X", "cross_mated"),
    # Same crew, GENUINE lot — exposed through the crew factor only (deeper root).
    ("AST-PV-GJ-S19", "pv_string", "mc4_connector", "GJ-SOLAR-2", "hot-arid", "WEST-SOLAR", "MOD-LOT-A", "tier1-mono", "healthy", "SunVolt", "CREW-PV-3", "MC4-LOT-Y", "genuine"),
    # Healthy CONTROL: shares MOD-LOT-A with the demo asset, but GOOD crew + genuine
    # lot -> stays healthy. Proves the module batch is NOT the cause. A "same batch"
    # SQL query would falsely implicate this string (or miss the real ones).
    ("AST-PV-MH-S05", "pv_string", "mc4_connector", "MH-SOLAR-3", "hot-arid", "SOUTH-SOLAR", "MOD-LOT-A", "tier1-mono", "healthy", "SunVolt", "CREW-PV-1", "MC4-LOT-Z", "genuine"),
    # Two more strings the same crew installed — not failed yet, but EXPOSED. These
    # inflate CREW-PV-3's criticality (the proactive "harden this crew first" signal).
    ("AST-PV-RJ-S15", "pv_string", "mc4_connector", "RJ-SOLAR-1", "hot-arid", "WEST-SOLAR", "MOD-LOT-B", "tier1-mono", "healthy", "SunVolt", "CREW-PV-3", "MC4-LOT-Y", "genuine"),
    ("AST-PV-GJ-S22", "pv_string", "mc4_connector", "GJ-SOLAR-2", "hot-arid", "WEST-SOLAR", "MOD-LOT-C", "tier1-mono", "healthy", "SunVolt", "CREW-PV-3", "MC4-LOT-X", "cross_mated"),
]

# Two PRIOR closed cases — the learned layer the next case reasons over. These are
# the connectors that already burned in CREW-PV-3's work, on different module
# batches. They give common_cause() real data: the shared root is the crew + lot.
PRIOR_CASES = [
    ("AST-PV-RJ-S07", "mc4_connector_burn", 0.94, "CASE-PV-0731"),
    ("AST-PV-GJ-S03", "mc4_connector_burn", 0.91, "CASE-PV-0744"),
]

SEED = """
MERGE (v:Vendor {name:$vendor})
MERGE (b:Batch {batch_id:$batch_id}) SET b.spec=$batch_spec, b.status=$batch_status
MERGE (b)-[:SUPPLIED_BY]->(v)
MERGE (k:Cluster {name:$cluster})
MERGE (s:Site {site_id:$site_id}) SET s.environment=$environment, s.cluster=$cluster
MERGE (s)-[:IN_CLUSTER]->(k)
MERGE (e:EquipmentClass {name:$equip_class})
MERGE (c:Component {name:$component})
MERGE (w:Crew {crew_id:$crew})
MERGE (p:PartLot {lot_id:$part_lot}) SET p.status=$part_lot_status
MERGE (a:Asset {asset_id:$asset_id})
MERGE (a)-[:FROM_BATCH]->(b)
MERGE (a)-[:LOCATED_AT]->(s)
MERGE (a)-[:OF_CLASS]->(e)
MERGE (a)-[:HAS_COMPONENT]->(c)
MERGE (a)-[:INSTALLED_BY]->(w)
MERGE (a)-[:USES_PART_LOT]->(p)
"""

PRIOR = """
MATCH (a:Asset {asset_id:$asset_id})
MERGE (f:FailureMode {name:$failure_mode})
MERGE (a)-[r:EXHIBITS]->(f)
  SET r.confidence=$confidence, r.case_id=$case_id, r.ts='prior'
"""


def _apply_constraints(ses) -> None:
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    text = open(os.path.join(here, "kg_schema.cypher"), encoding="utf-8").read()
    for stmt in (s.strip() for s in text.split(";")):
        if stmt and not stmt.startswith("//"):
            ses.run(stmt)


def seed() -> None:
    cols = ["asset_id", "equip_class", "component", "site_id", "environment",
            "cluster", "batch_id", "batch_spec", "batch_status", "vendor",
            "crew", "part_lot", "part_lot_status"]
    with kg.driver() as d, d.session(database=kg.database()) as ses:
        _apply_constraints(ses)  # idempotent (IF NOT EXISTS) — no browser step needed
        for row in FLEET:
            ses.run(SEED, **dict(zip(cols, row)))
        for asset_id, fm, conf, case in PRIOR_CASES:
            ses.run(PRIOR, asset_id=asset_id, failure_mode=fm,
                    confidence=conf, case_id=case)


if __name__ == "__main__":
    seed()
    print(f"Seeded {len(FLEET)} assets + {len(PRIOR_CASES)} prior cases.\n")

    print("== v1 single-batch blast-radius from AST-RF-DEL-0473 (the opener) ==")
    for r in kg.blast_radius("AST-RF-DEL-0473"):
        print(f"  {r['site_id']:10} env={r['environment']:8} batch={r['batch_id']} ({r['batch_status']})")

    print("\n== MULTI-FACTOR blast-radius from AST-PV-RJ-S12 (the punch) ==")
    for r in kg.multi_factor_blast_radius("AST-PV-RJ-S12"):
        vias = ", ".join(f"{s['via']}={s['node']}" for s in r["shared"])
        print(f"  {r['asset_id']:14} via [{vias}]")

    print("\n== COMMON-CAUSE of 'mc4_connector_burn' (root, not symptom) ==")
    for r in kg.common_cause("mc4_connector_burn"):
        print(f"  {r['factor_type']:6} {r['factor']:10} explains {r['explains']} failures  {r['assets']}")

    print("\n== CRITICALITY ranking (biggest single-points-of-failure first) ==")
    for r in kg.criticality_ranking(top=6):
        print(f"  {r['factor_type']:6} {r['factor']:12} {r['dependents']} assets depend on it")

    print("\n(The module batch never tops common-cause -- MOD-LOT-A even hosts a")
    print(" HEALTHY string (MH-S05). The crew + connector lot are the real root.")
    print(" A `WHERE batch = X` query cannot find this, and would flag MOD-LOT-A.)")
