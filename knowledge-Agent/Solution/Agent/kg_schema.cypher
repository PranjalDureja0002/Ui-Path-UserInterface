// ── FOREMAN Knowledge Graph — generic ontology (domain-agnostic) ──────────────
// Run once in the Neo4j Browser (AuraDB) to add uniqueness constraints.
// The node/relationship shapes below fit ANY field-ops domain — the values
// (RF cable, IMM machine, transformer…) are just data, not schema.

CREATE CONSTRAINT asset_id   IF NOT EXISTS FOR (a:Asset)          REQUIRE a.asset_id IS UNIQUE;
CREATE CONSTRAINT site_id    IF NOT EXISTS FOR (s:Site)           REQUIRE s.site_id  IS UNIQUE;
CREATE CONSTRAINT batch_id   IF NOT EXISTS FOR (b:Batch)          REQUIRE b.batch_id IS UNIQUE;
CREATE CONSTRAINT vendor_nm  IF NOT EXISTS FOR (v:Vendor)         REQUIRE v.name     IS UNIQUE;
CREATE CONSTRAINT class_nm   IF NOT EXISTS FOR (e:EquipmentClass) REQUIRE e.name     IS UNIQUE;
CREATE CONSTRAINT comp_nm    IF NOT EXISTS FOR (c:Component)      REQUIRE c.name     IS UNIQUE;
CREATE CONSTRAINT fmode_nm   IF NOT EXISTS FOR (f:FailureMode)    REQUIRE f.name     IS UNIQUE;
CREATE CONSTRAINT cluster_nm IF NOT EXISTS FOR (k:Cluster)        REQUIRE k.name     IS UNIQUE;

// Generic shape (created by the seed + grown per case):
//   (Asset)-[:FROM_BATCH]->(Batch)-[:SUPPLIED_BY]->(Vendor)
//   (Asset)-[:LOCATED_AT]->(Site {environment, cluster, status})-[:IN_CLUSTER]->(Cluster)
//   (Asset)-[:OF_CLASS]->(EquipmentClass)
//   (Asset)-[:HAS_COMPONENT]->(Component)
//   (Asset)-[:EXHIBITS {confidence, case_id, ts}]->(FailureMode)
