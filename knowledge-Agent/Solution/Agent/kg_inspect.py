"""Read-only snapshot of the live graph: label counts, relationship counts, and
the MC4 cross-mating cluster laid out by its factors. Run after kg_seed.py:

    uv run python kg_inspect.py
"""
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
for _l in open(os.path.join(_HERE, ".env"), encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import kg  # noqa: E402

LABELS = "MATCH (n) RETURN head(labels(n)) AS label, count(*) AS n ORDER BY label"
RELS = "MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS n ORDER BY rel"
MC4 = """
MATCH (a:Asset)-[:INSTALLED_BY]->(w:Crew)
WHERE a.asset_id STARTS WITH 'AST-PV'
MATCH (a)-[:FROM_BATCH]->(b:Batch)
MATCH (a)-[:USES_PART_LOT]->(p:PartLot)
MATCH (a)-[:LOCATED_AT]->(s:Site)
OPTIONAL MATCH (a)-[:EXHIBITS]->(f:FailureMode)
RETURN a.asset_id AS asset, s.site_id AS site, b.batch_id AS batch,
       p.lot_id AS lot, p.status AS lot_status, w.crew_id AS crew,
       (f IS NOT NULL) AS failed
ORDER BY crew, lot, asset
"""

if __name__ == "__main__":
    with kg.driver() as d, d.session(database=kg.database()) as ses:
        labels = ses.run(LABELS).data()
        rels = ses.run(RELS).data()
        mc4 = ses.run(MC4).data()

    print("\n== NODES ==")
    for r in labels:
        print(f"  {r['label']:16} {r['n']}")
    print(f"  {'TOTAL':16} {sum(r['n'] for r in labels)}")

    print("\n== RELATIONSHIPS ==")
    for r in rels:
        print(f"  {r['rel']:16} {r['n']}")
    print(f"  {'TOTAL':16} {sum(r['n'] for r in rels)}")

    print("\n== MC4 / solar cluster (the cross-mating story) ==")
    print(f"  {'asset':14} {'site':11} {'batch':10} {'lot':10} {'lot_status':12} {'crew':10} state")
    for r in mc4:
        state = "BURNED" if r["failed"] else "ok"
        print(f"  {r['asset']:14} {r['site']:11} {r['batch']:10} {r['lot']:10} "
              f"{r['lot_status']:12} {r['crew']:10} {state}")
