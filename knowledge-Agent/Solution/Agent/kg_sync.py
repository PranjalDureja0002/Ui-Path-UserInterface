"""Sync the structural backbone from UiPath Data Fabric into Neo4j.

This is the production replacement for kg_seed.py: instead of hard-coded rows, it reads the
real system-of-record (Data Fabric entities VendorTest/BatchTest/SiteTest/AssetTest) and MERGEs them into the
graph. MERGE is idempotent, so it is safe to run on a schedule.

    uipath auth                 # one-time auth for this machine
    uv run python kg_sync.py

In production, attach this to an Orchestrator time trigger (e.g. nightly) so the graph stays
current as towers and batches change in Data Fabric. The learned layer (EXHIBITS / failure_pattern)
is written separately by the agent's close mode and is never overwritten by this sync.
"""
import os

# load .env (Neo4j creds) before importing kg
for _l in open(".env", encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import kg  # noqa: E402
from kg_seed import _apply_constraints  # noqa: E402
from uipath.platform import UiPath  # noqa: E402

VENDOR = "MERGE (v:Vendor {name:$name})"
BATCH = """
MERGE (v:Vendor {name:$vendor})
MERGE (b:Batch {batch_id:$batch_id}) SET b.spec=$spec, b.status=$status
MERGE (b)-[:SUPPLIED_BY]->(v)
"""
SITE = """
MERGE (k:Cluster {name:$cluster})
MERGE (s:Site {site_id:$site_id}) SET s.environment=$environment, s.status=$status
MERGE (s)-[:IN_CLUSTER]->(k)
"""
ASSET = """
MERGE (e:EquipmentClass {name:$equipment_class})
MERGE (c:Component {name:$component})
MERGE (a:Asset {asset_id:$asset_id})
MERGE (a)-[:OF_CLASS]->(e)
MERGE (a)-[:HAS_COMPONENT]->(c)
WITH a MATCH (b:Batch {batch_id:$batch_id}) MERGE (a)-[:FROM_BATCH]->(b)
WITH a MATCH (s:Site {site_id:$site_id}) MERGE (a)-[:LOCATED_AT]->(s)
"""


def g(row: dict, key: str, default: str = "") -> str:
    """Field getter tolerant of Data Fabric's column-name transforms (case + underscores).
    Matches 'batch_id' to 'batchId', 'BatchId', 'batchid', etc."""
    def norm(s: str) -> str:
        return "".join(ch for ch in str(s).lower() if ch.isalnum())
    target = norm(key)
    for k, v in row.items():
        if norm(k) == target:
            return "" if v is None else str(v)
    return default


def _as_dict(rec) -> dict:
    if isinstance(rec, dict):
        return rec
    if hasattr(rec, "model_dump"):
        return rec.model_dump()
    if hasattr(rec, "data") and isinstance(rec.data, dict):
        return rec.data
    return dict(getattr(rec, "__dict__", {}))


def fetch(sdk: UiPath, entity: str) -> list[dict]:
    # list_records has no SQL column/filter limits (query_entity_records caps at 4 cols)
    ent = sdk.entities.retrieve_by_name(entity)
    key = getattr(ent, "key", None) or getattr(ent, "id", None)
    return [_as_dict(r) for r in sdk.entities.list_records(key)]


if __name__ == "__main__":
    sdk = UiPath()
    # entity *Name* underscore-stripped by Data Fabric (Display 'Vendor_Test' -> Name 'VendorTest')
    vendors = fetch(sdk, "VendorTest")
    batches = fetch(sdk, "BatchTest")
    sites = fetch(sdk, "SiteTest")
    assets = fetch(sdk, "AssetTest")

    with kg.driver() as d, d.session(database=kg.database()) as ses:
        _apply_constraints(ses)
        for r in vendors:
            ses.run(VENDOR, name=g(r, "name"))
        for r in batches:
            ses.run(BATCH, batch_id=g(r, "batch_id"), spec=g(r, "spec"),
                    status=g(r, "status", "in_service"), vendor=g(r, "vendor"))
        for r in sites:
            ses.run(SITE, site_id=g(r, "site_id"), environment=g(r, "environment"),
                    cluster=g(r, "cluster"), status=g(r, "status", "operational"))
        for r in assets:
            ses.run(ASSET, asset_id=g(r, "asset_id"), equipment_class=g(r, "equipment_class"),
                    component=g(r, "component"), batch_id=g(r, "batch_id"), site_id=g(r, "site_id"))

    print(f"Synced Data Fabric -> Neo4j: {len(vendors)} vendors, {len(batches)} batches, "
          f"{len(sites)} sites, {len(assets)} assets.")
