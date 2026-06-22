"""Why a knowledge graph and not "just a Data Fabric query?" — the live proof.

Read-only. Run it any time (after kg_seed.py) to put the SQL answer and the graph
answer side by side on the SAME case:

    uv run python kg_why_graph.py

The case: a burned MC4 connector on AST-PV-RJ-S12 (module batch MOD-LOT-A). The
real failure cluster spans THREE different module batches but shares one install
crew + one connector lot. So:
  • the SQL "same batch" query finds a HEALTHY string and MISSES the real failures
  • the graph finds the true cluster, names the root cause, and ranks the SPOF
"""
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
for _l in open(os.path.join(_HERE, ".env"), encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import kg  # noqa: E402

ASSET = "AST-PV-RJ-S12"
FAILURE = "mc4_connector_burn"

# What a relational Data Fabric query can express: one shared column, one hop.
# (We run it in Cypher only to read the SAME live data — it is a pure batch JOIN.)
SQL_EQUIVALENT = """
MATCH (a:Asset {asset_id:$asset_id})-[:FROM_BATCH]->(b:Batch)<-[:FROM_BATCH]-(o:Asset)
WHERE o <> a
OPTIONAL MATCH (o)-[ex:EXHIBITS]->(:FailureMode {name:$fm})
RETURN o.asset_id AS asset_id, b.batch_id AS batch_id,
       (ex IS NOT NULL) AS has_failed
ORDER BY asset_id
"""


def line(c="-", n=74):
    print(c * n)


if __name__ == "__main__":
    with kg.driver() as d, d.session(database=kg.database()) as ses:
        sql_rows = ses.run(SQL_EQUIVALENT, asset_id=ASSET, fm=FAILURE).data()

    print()
    line("=")
    print(f"  CASE: burned MC4 connector on {ASSET}   (failure = {FAILURE})")
    line("=")

    print("\n[1] THE SKEPTIC'S QUERY  ->  SELECT assets WHERE batch = <this asset's batch>")
    print("    (one shared column, one hop -- the most a relational join can do)\n")
    for r in sql_rows:
        flag = "ALREADY FAILED" if r["has_failed"] else "healthy"
        print(f"      {r['asset_id']:14} batch={r['batch_id']:10} {flag}")
    failed_in_sql = [r["asset_id"] for r in sql_rows if r["has_failed"]]
    print(f"\n    -> SQL surfaces {len(sql_rows)} same-batch peers, "
          f"{len(failed_in_sql)} of which actually failed: {failed_in_sql or 'NONE'}")
    print("    -> It includes a HEALTHY string and MISSES the real burns "
          "(they're on other batches).")

    print("\n[2] FOREMAN'S GRAPH  ->  traverse EVERY failure-propagating factor\n")
    for r in kg.multi_factor_blast_radius(ASSET):
        vias = ", ".join(f"{s['via'].replace('_',' ').lower()}={s['node']}"
                         for s in r["shared"])
        print(f"      {r['asset_id']:14} [{vias}]")

    print("\n[3] COMMON-CAUSE  ->  the shared upstream node that explains the failures")
    print("    (the ROOT, not the symptom -- a lowest-common-ancestor query)\n")
    for r in kg.common_cause(FAILURE):
        print(f"      {r['factor_type']:8} {r['factor']:11} explains {r['explains']} "
              f"prior failures {r['assets']}")
    print("\n    -> Root = the install CREW + the connector LOT. The module batch")
    print("       NEVER appears -- exactly the column SQL keyed on.")

    print("\n[4] CRITICALITY  ->  which factor, if bad, exposes the MOST assets?")
    print("    (degree centrality -- the PROACTIVE 'harden this first' signal)\n")
    for r in kg.criticality_ranking(top=4):
        print(f"      {r['factor_type']:8} {r['factor']:12} {r['dependents']} assets exposed")

    print()
    line("=")
    print("  VERDICT: same data, same case. SQL flags a healthy string and misses")
    print("  the real cluster. The graph names the root cause (crew + lot), shows")
    print("  every at-risk asset WITH the reason, and ranks the SPOF to fix first.")
    print("  That gap is not a query you tune -- it is a capability SQL doesn't have.")
    line("=")
    print()
