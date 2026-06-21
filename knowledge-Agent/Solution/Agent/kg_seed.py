"""Seed the FOREMAN knowledge graph with a structural backbone, then verify a
blast-radius query. Run once against your AuraDB after setting NEO4J_* in .env:

    uv run python kg_seed.py

The MERGE statements are idempotent (safe to re-run). The seed mirrors what a
real Data-Fabric -> Neo4j sync would create. The shape is generic; these
particular rows are the demo fleet so blast-radius returns the coastal NG-BATCH-22 sites.
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

# (asset_id, equip_class, component, site_id, environment, cluster, batch_id, batch_spec, batch_status, vendor)
FLEET = [
    ("AST-RF-DEL-0473", "rf_jumper_cable", "jumper", "DEL-0473", "coastal", "WEST-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid"),
    ("AST-RF-MUM-0210", "rf_jumper_cable", "jumper", "MUM-0210", "coastal", "WEST-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid"),
    ("AST-RF-GOA-0188", "rf_jumper_cable", "jumper", "GOA-0188", "coastal", "WEST-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid"),
    ("AST-RF-KOC-0231", "rf_jumper_cable", "jumper", "KOC-0231", "coastal", "SOUTH-COAST", "NG-BATCH-22", "non-marine", "failing", "NorthGrid"),
    ("AST-RF-BLR-0337", "rf_jumper_cable", "jumper", "BLR-0337", "dry", "SOUTH-INLAND", "NG-BATCH-30", "marine-grade", "healthy", "NorthGrid"),
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
MERGE (a:Asset {asset_id:$asset_id})
MERGE (a)-[:FROM_BATCH]->(b)
MERGE (a)-[:LOCATED_AT]->(s)
MERGE (a)-[:OF_CLASS]->(e)
MERGE (a)-[:HAS_COMPONENT]->(c)
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
            "cluster", "batch_id", "batch_spec", "batch_status", "vendor"]
    with kg.driver() as d, d.session(database=kg.database()) as ses:
        _apply_constraints(ses)  # idempotent (IF NOT EXISTS) — no browser step needed
        for row in FLEET:
            ses.run(SEED, **dict(zip(cols, row)))


if __name__ == "__main__":
    seed()
    print(f"Applied constraints + seeded {len(FLEET)} assets into the knowledge graph.\n")

    print("Blast-radius from AST-RF-DEL-0473:")
    for r in kg.blast_radius("AST-RF-DEL-0473"):
        print(f"  {r['site_id']:10} env={r['environment']:8} batch={r['batch_id']} ({r['batch_status']})")
    print("\n(Expect the coastal NG-BATCH-22 sites - DEL, MUM, GOA, KOC - and NOT the dry BLR / marine batch.)")
