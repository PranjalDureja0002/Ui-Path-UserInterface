import type {
  Asset,
  Batch,
  ServiceContract,
  Site,
  Vendor,
  Warranty,
} from '../types'

// ── Data Fabric: the structured system of record (mock seed rows) ───────────

export const SITES: Site[] = [
  { site_id: 'DEL-0473', cluster: 'WEST-COAST', environment: 'coastal', humidity: 85, tenants: 3 },
  { site_id: 'MUM-0210', cluster: 'WEST-COAST', environment: 'coastal', humidity: 82, tenants: 3 },
  { site_id: 'BLR-0337', cluster: 'SOUTH-INLAND', environment: 'dry', humidity: 45, tenants: 2 },
]

export const ASSETS: Asset[] = [
  {
    asset_id: 'AST-RF-DEL-0473',
    type: 'rf_jumper_cable',
    installed: '2026-05-15',
    vendor: 'NorthGrid',
    batch: 'NG-BATCH-22',
    spec: 'non-marine',
  },
  {
    asset_id: 'AST-DG-DEL-0473',
    type: 'diesel_generator',
    installed: '2023-02-10',
    vendor: 'PowerCore',
    batch: '—',
    spec: 'standard',
  },
]

export const WARRANTIES: Warranty[] = [
  {
    warranty_id: 'WR-7781',
    asset_id: 'AST-RF-DEL-0473',
    window: '90 days',
    status: 'active',
    liable: 'per_warranty',
  },
]

export const SERVICE_CONTRACTS: ServiceContract[] = [
  { tenant: 'Airtel', contract: 'SLA-A', penalty_per_hr: 22000, response_sla_min: 60 },
  { tenant: 'Jio', contract: 'SLA-B', penalty_per_hr: 16000, response_sla_min: 60 },
  { tenant: 'Vodafone Idea', contract: 'SLA-C', penalty_per_hr: 10000, response_sla_min: 90 },
]

export const TOTAL_EXPOSURE_PER_HR = SERVICE_CONTRACTS.reduce(
  (s, c) => s + c.penalty_per_hr,
  0,
) // ≈ ₹48,000 / hr

export const BATCHES: Batch[] = [
  { batch_id: 'NG-BATCH-22', vendor: 'NorthGrid', spec: 'non-marine', status: 'failing' },
  { batch_id: 'NG-BATCH-30', vendor: 'NorthGrid', spec: 'marine-grade', status: 'healthy' },
]

export const VENDORS: Vendor[] = [
  {
    vendor: 'NorthGrid',
    contact: 'ops@northgrid.example',
    escalation_role: 'cluster_manager',
    escalation_phone: '+91-98xxxxxx',
  },
]

// ── Context Grounding: documents the agents cite (excerpts) ─────────────────
export const GROUNDING_DOCS: { file: string; line: string; tag: string }[] = [
  {
    file: 'rf-cable-spec-NG-22.pdf',
    line: 'NG-BATCH-22: PVC sheath, non-marine rating. Not for coastal/high-salinity sites; marine-grade (NG-30) advised above 80% humidity.',
    tag: 'spec',
  },
  {
    file: 'corrosion-troubleshooting.pdf',
    line: 'Green/white deposits at the connector = salt-driven galvanic corrosion. Distinguish from surface discolouration (no pitting).',
    tag: 'manual',
  },
  {
    file: 'dg-maintenance-manual.pdf',
    line: 'Knocking under load with normal oil pressure → injector timing or worn bearings; schedule a swap if recurring.',
    tag: 'manual',
  },
  {
    file: 'sla-master-agreement.pdf',
    line: 'Downtime penalties accrue per tenant per hour from the SLA response breach.',
    tag: 'sla',
  },
  {
    file: 'few-shot-cases.md',
    line: 'Worked coastal-corrosion examples that teach the reasoning style.',
    tag: 'few-shot',
  },
  {
    file: 'anti-patterns.md',
    line: 'Do NOT call discolouration corrosion without pitting/deposits. Do NOT assume workmanship when spec mismatch + environment explain it.',
    tag: 'anti-pattern',
  },
]

// ── The four stores (for the landing + dashboard "stores" rail) ─────────────
export const STORES = [
  {
    id: 'data_fabric',
    name: 'Data Fabric',
    holds: 'Site · Asset · Warranty · Tenant · Vendor · Batch',
    agentsDo: 'read + write records',
    hue: 'mint' as const,
  },
  {
    id: 'context_grounding',
    name: 'Context Grounding',
    holds: 'Manuals · specs · SLA clauses · few-shot · anti-patterns · skill cards',
    agentsDo: 'ask + get cited answers',
    hue: 'amber' as const,
  },
  {
    id: 'agent_memory',
    name: 'Agent Memory',
    holds: 'Episodic past cases and human decisions / corrections',
    agentsDo: '“seen this before?”',
    hue: 'rose' as const,
  },
  {
    id: 'neo4j',
    name: 'Neo4j Graph',
    holds: 'The connection brain — blast-radius + causal paths',
    agentsDo: 'query with Cypher',
    hue: 'periwinkle' as const,
  },
]
