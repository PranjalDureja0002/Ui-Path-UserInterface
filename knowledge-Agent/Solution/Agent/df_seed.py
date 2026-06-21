"""Seed UiPath Data Fabric with the mock FOREMAN fleet — the "assets already stored
in the DB" layer. Run AFTER creating the 4 entities (see df_schema.md) and authenticating:

    uipath auth
    uv run python df_seed.py

Batches start as 'in_service' on purpose — the knowledge graph LEARNS the 'failure_pattern'
from closed cases (grow). Re-running may create duplicate rows in Data Fabric, but that's
harmless: kg_sync.py uses MERGE, so the graph stays correct regardless.
"""
import os
from types import SimpleNamespace

# load .env so UiPath auth (written by `uipath auth`) and any creds are picked up
for _l in open(".env", encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

from uipath.platform import UiPath  # noqa: E402

VENDORS = [
    {"name": "NorthGrid"},
]
BATCHES = [
    {"batch_id": "NG-BATCH-22", "spec": "non-marine",  "status": "in_service", "vendor": "NorthGrid"},
    {"batch_id": "NG-BATCH-30", "spec": "marine-grade", "status": "in_service", "vendor": "NorthGrid"},
]
SITES = [
    {"site_id": "DEL-0473", "environment": "coastal", "cluster": "WEST-COAST",   "status": "operational"},
    {"site_id": "MUM-0210", "environment": "coastal", "cluster": "WEST-COAST",   "status": "operational"},
    {"site_id": "GOA-0188", "environment": "coastal", "cluster": "WEST-COAST",   "status": "operational"},
    {"site_id": "KOC-0231", "environment": "coastal", "cluster": "SOUTH-COAST",  "status": "operational"},
    {"site_id": "BLR-0337", "environment": "dry",     "cluster": "SOUTH-INLAND", "status": "operational"},
]
ASSETS = [
    {"asset_id": "AST-RF-DEL-0473", "equipment_class": "rf_jumper_cable", "component": "jumper", "site_id": "DEL-0473", "batch_id": "NG-BATCH-22"},
    {"asset_id": "AST-RF-MUM-0210", "equipment_class": "rf_jumper_cable", "component": "jumper", "site_id": "MUM-0210", "batch_id": "NG-BATCH-22"},
    {"asset_id": "AST-RF-GOA-0188", "equipment_class": "rf_jumper_cable", "component": "jumper", "site_id": "GOA-0188", "batch_id": "NG-BATCH-22"},
    {"asset_id": "AST-RF-KOC-0231", "equipment_class": "rf_jumper_cable", "component": "jumper", "site_id": "KOC-0231", "batch_id": "NG-BATCH-22"},
    {"asset_id": "AST-RF-BLR-0337", "equipment_class": "rf_jumper_cable", "component": "jumper", "site_id": "BLR-0337", "batch_id": "NG-BATCH-30"},
]


def _seed(sdk: UiPath, entity_name: str, rows: list[dict]) -> None:
    # Data Fabric strips underscores from field Names (asset_id -> assetid), so match them.
    # strip underscores to match DF field Names, and wrap as objects (insert_records reads __dict__)
    records = [SimpleNamespace(**{k.replace("_", ""): v for k, v in r.items()}) for r in rows]
    entity = sdk.entities.retrieve_by_name(entity_name)
    entity_key = getattr(entity, "key", None) or getattr(entity, "id", None)
    sdk.entities.insert_records(entity_key, records)
    print(f"  {entity_name:9} +{len(records)} records")


if __name__ == "__main__":
    sdk = UiPath()
    print("Seeding Data Fabric:")
    # Use the entity *Name* (logical, underscore-stripped by Data Fabric), not the Display Name:
    #   Display 'Vendor_Test' -> Name 'VendorTest'
    _seed(sdk, "VendorTest", VENDORS)
    _seed(sdk, "BatchTest", BATCHES)
    _seed(sdk, "SiteTest", SITES)
    _seed(sdk, "AssetTest", ASSETS)
    print("Done. Now run:  uv run python kg_sync.py")
