# Data Fabric entities — the system of record FOREMAN syncs from

This is the "assets already stored in the DB" layer. You create these **4 entities** once in the
UiPath portal (**Data Service → Entities → New entity**); then `df_seed.py` fills them with mock
data and `kg_sync.py` mirrors them into Neo4j. The graph is never hand-authored — structure flows
from here.

> **Display Name vs Name:** Data Fabric strips special characters from the *Name* (the logical id
> the SDK/SQL use). So set **Display Name** `Vendor_Test` and Data Fabric makes the **Name**
> `VendorTest` — the scripts target the **Name** (`VendorTest`, `BatchTest`, `SiteTest`,
> `AssetTest`). At creation: **Location = Tenant (DefaultTenant)**, role-based access **off**.
>
> Field **names must match exactly** (lowercase, as below) — `df_seed.py` and `kg_sync.py` look
> them up by these names. When you add a field, set its *Name* to the value in the first column.
> All fields are **Text** unless noted. Each entity also has the built-in system `Id` (GUID) PK.

### Entity: `Vendor_Test`
| Field | Type | Example |
|-------|------|---------|
| `name` | Text | `NorthGrid` |

### Entity: `Batch_Test`
| Field | Type | Example |
|-------|------|---------|
| `batch_id` | Text | `NG-BATCH-22` |
| `spec` | Text | `non-marine` |
| `status` | Text | `in_service` (the graph *learns* `failure_pattern`; start them in service) |
| `vendor` | Text | `NorthGrid` (matches a `Vendor_Test.name`) |

### Entity: `Site_Test`
| Field | Type | Example |
|-------|------|---------|
| `site_id` | Text | `DEL-0473` |
| `environment` | Text | `coastal` |
| `cluster` | Text | `WEST-COAST` |
| `status` | Text | `operational` |

### Entity: `Asset_Test`
| Field | Type | Example |
|-------|------|---------|
| `asset_id` | Text | `AST-RF-DEL-0473` |
| `equipment_class` | Text | `rf_jumper_cable` |
| `component` | Text | `jumper` |
| `site_id` | Text | `DEL-0473` (matches a `Site_Test.site_id`) |
| `batch_id` | Text | `NG-BATCH-22` (matches a `Batch_Test.batch_id`) |

Relationships are kept as **text foreign keys** (`vendor`, `site_id`, `batch_id`) instead of
Data-Fabric relationship fields — simpler to seed, and `kg_sync.py` joins on them when it builds
the graph edges. (You can upgrade to real DF relationships later without changing the graph.)

## After creating the entities
```powershell
uipath auth                 # one-time: authenticate this machine to your tenant
uv run python df_seed.py    # fills the 4 entities with the mock fleet
uv run python kg_sync.py    # mirrors Data Fabric -> Neo4j (replaces kg_seed as the backbone)
```
In production `kg_sync.py` runs on an Orchestrator **time trigger** (nightly) so the graph stays
current as towers/batches change in Data Fabric.
