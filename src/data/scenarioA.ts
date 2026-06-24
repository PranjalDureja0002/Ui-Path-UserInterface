import type { Scenario, TimelineStep } from '../types'
import { AFFECTED_SITES, FLEET_EDGES, FLEET_NODES } from './fleet'

// ─────────────────────────────────────────────────────────────────────────────
// Scenario A — CASE-0916 · DEL-0473
// First coastal-corrosion case. No skill exists yet → the crew reasons from
// scratch, a high risk score triggers a real voice call, guarded BPMN writes
// land, and on the thumbs-up a candidate skill card is born.
// ─────────────────────────────────────────────────────────────────────────────

const steps: TimelineStep[] = [
  {
    at: 0,
    event: {
      kind: 'case.opened',
      case: {
        case_id: 'CASE-0916',
        site_id: 'DEL-0473',
        title: 'RF jumper corrosion recurrence + DG knock',
        worker_phone: '+91-9xxxxxxx',
        worker_name: 'R. Mehta (field tech)',
        stage: 'intake',
        status: 'open',
        scenario: 'A',
        opened_at: '14:28',
        risk_score: null,
      },
    },
    log: { stage: 'intake', source: 'Maestro', text: 'Case CASE-0916 opened from WhatsApp trigger', tone: 'info' },
  },
  {
    at: 600,
    event: {
      kind: 'message',
      message: {
        id: 'm1',
        from: 'worker',
        text: 'Tower RF cable looks corroded again at DEL-0473, and the backup generator is knocking under load. Sending a clip.',
        ts: '14:28',
        media: [
          { kind: 'video', label: 'clip.mp4' },
          { kind: 'audio', label: 'note.ogg' },
        ],
      },
    },
    log: { stage: 'intake', source: 'WhatsApp', text: 'Field tech reported a fault with a clip + voice note', tone: 'human' },
  },
  {
    at: 1600,
    event: {
      kind: 'media.received',
      media: [
        { kind: 'video', label: 'clip.mp4' },
        { kind: 'audio', label: 'note.ogg' },
      ],
    },
    log: { stage: 'intake', source: 'Storage Bucket', text: 'Media saved → bucket://media/clip.mp4, note.ogg', tone: 'ok' },
  },
  // ── CONFIRM (triage — acknowledge the report, authorise full analysis) ─────
  { at: 2600, event: { kind: 'stage.entered', stage: 'confirm' }, log: { stage: 'confirm', source: 'Maestro', text: 'Entering Confirm — triage the report (Action Center)', tone: 'info' } },
  {
    at: 3000,
    event: {
      kind: 'task.raised',
      task: {
        id: 'ACT-551',
        kind: 'confirm',
        prompt: 'Corroded RF jumper + a knocking generator reported at DEL-0473, with a clip and a voice note. Confirm priority and authorise full analysis?',
        options: ['proceed', 'hold'],
        status: 'pending',
      },
    },
  },
  {
    at: 3300,
    event: {
      kind: 'message',
      message: {
        id: 'm2',
        from: 'foreman',
        text: 'Got your report on DEL-0473 — RF corrosion plus a generator knock. Confirming priority and starting the analysis now. OK to proceed?',
        ts: '14:29',
        options: ['Proceed', 'Hold'],
      },
    },
    log: { stage: 'confirm', source: 'Action Center', text: 'Parked — waiting for the tech to confirm priority', tone: 'warn' },
  },
  { at: 5600, event: { kind: 'task.answered', taskId: 'ACT-551', answer: 'Proceed', by: 'R. Mehta' } },
  {
    at: 5800,
    event: { kind: 'message', message: { id: 'm3', from: 'worker', text: 'Yes — go ahead. 👍', ts: '14:29' } },
    log: { stage: 'confirm', source: 'WhatsApp', text: 'Tech confirmed — proceeding to analysis', tone: 'human' },
  },

  // ── PERCEIVE (multimodal vision — read the clip + voice note) ──────────────
  { at: 6400, event: { kind: 'stage.entered', stage: 'perceive' }, log: { stage: 'perceive', source: 'Maestro', text: 'Entering Perceive — Supervisor + Vision', tone: 'info' } },
  { at: 6800, event: { kind: 'agent.assembled', agent: 'supervisor' } },
  { at: 7000, event: { kind: 'agent.running', agent: 'supervisor' }, log: { stage: 'perceive', source: 'Supervisor', text: 'Reading asset history + corrosion guidance', tone: 'agent' } },
  { at: 7400, event: { kind: 'agent.assembled', agent: 'vision' } },
  { at: 7600, event: { kind: 'agent.running', agent: 'vision' }, log: { stage: 'perceive', source: 'Vision · Gemini', text: 'Analysing picture (corrosion) + sound (knock)', tone: 'agent' } },
  {
    at: 10000,
    event: {
      kind: 'perception.ready',
      perception: {
        corrosion: { present: true, severity: 'high' },
        generator_audio: { anomaly: 'knock', confidence: 0.86 },
        issues: ['rf_cable_corrosion', 'dg_mechanical_fault'],
      },
      asset_note: 'replaced 32d ago · NorthGrid · NG-BATCH-22 · warranty active',
    },
    log: { stage: 'perceive', source: 'Vision · Gemini', text: 'Corrosion present (high) · generator knock 0.86', tone: 'ok' },
  },
  { at: 10200, event: { kind: 'agent.completed', agent: 'vision', run: { headline: 'Corrosion high · knock 0.86', detail: 'Salt/oxidation visible at connector; knock under load', confidence: 0.86, citations: ['corrosion-troubleshooting#p2'] } } },
  {
    at: 10800,
    event: { kind: 'skill.matched', hit: null },
    log: { stage: 'perceive', source: 'Context Grounding', text: 'No skill card matches — reasoning from scratch', tone: 'warn' },
  },
  { at: 11200, event: { kind: 'agent.completed', agent: 'supervisor', run: { headline: 'Perception confirmed', detail: 'Asset: non-marine RF cable, coastal site, warranty active' } } },

  { at: 12800, event: { kind: 'stage.entered', stage: 'investigate' }, log: { stage: 'investigate', source: 'Supervisor', text: 'Assembling the crew — running in parallel', tone: 'agent' } },
  { at: 13200, event: { kind: 'agent.assembled', agent: 'entitlement' } },
  { at: 13600, event: { kind: 'agent.assembled', agent: 'sla' } },
  { at: 14000, event: { kind: 'agent.assembled', agent: 'rootcause' } },
  { at: 14400, event: { kind: 'agent.assembled', agent: 'fleet' } },
  { at: 14800, event: { kind: 'agent.running', agent: 'entitlement' } },
  { at: 14900, event: { kind: 'agent.running', agent: 'sla' } },
  { at: 15000, event: { kind: 'agent.running', agent: 'rootcause' } },
  { at: 15100, event: { kind: 'agent.running', agent: 'fleet' } },
  {
    at: 17000,
    event: {
      kind: 'agent.completed',
      agent: 'entitlement',
      run: { headline: 'Vendor liable · warranty active', detail: 'Recurred in 90-day window AND warranty active → vendor_liable = true · batch NG-BATCH-22', confidence: 0.97 },
    },
    log: { stage: 'investigate', source: 'Entitlement', text: 'vendor_liable = true (NG-BATCH-22)', tone: 'ok' },
  },
  {
    at: 18400,
    event: {
      kind: 'agent.completed',
      agent: 'sla',
      run: { headline: 'Exposure ₹48k/hr · ETA 95 min', detail: 'Airtel ₹22k + Jio ₹16k + Vodafone Idea ₹10k per hour while breached', confidence: 0.9 },
    },
    log: { stage: 'investigate', source: 'SLA / Risk', text: 'Exposure ≈ ₹48,000/hr · crew ETA 95 min', tone: 'warn' },
  },
  {
    at: 19800,
    event: {
      kind: 'fleet.ready',
      fleet: { systemic: true, affected: AFFECTED_SITES, nodes: FLEET_NODES, edges: FLEET_EDGES },
    },
  },
  {
    at: 20000,
    event: {
      kind: 'agent.completed',
      agent: 'fleet',
      run: { headline: 'Systemic · 4 sites on NG-BATCH-22', detail: 'Blast-radius Cypher: DEL-0473, MUM-0210, GOA-0188, KOC-0231 on the failing non-marine batch in coastal clusters', confidence: 0.92, citations: ['neo4j:blast-radius'] },
    },
    log: { stage: 'investigate', source: 'Fleet · Neo4j', text: 'Systemic — 4 sites share the failing batch', tone: 'danger' },
  },
  {
    at: 21400,
    event: {
      kind: 'agent.completed',
      agent: 'rootcause',
      run: {
        headline: 'Spec defect — not workmanship',
        detail: 'Coastal + non-marine spec + 85% humidity → salt-driven spec defect. Workmanship ruled out (0.5).',
        confidence: 0.9,
        citations: ['rf-cable-spec-NG-22#p3', 'anti-patterns.md', 'few-shot-cases.md'],
      },
    },
    log: { stage: 'investigate', source: 'Root-cause', text: 'Root cause: spec defect (0.90); workmanship ruled out', tone: 'ok' },
  },
  { at: 22400, event: { kind: 'risk.scored', risk: 0.82 } },
  {
    at: 22900,
    event: {
      kind: 'investigation.ready',
      investigation: {
        root_cause: 'spec defect (non-marine cable, coastal salt air)',
        confidence: 0.9,
        alternatives_ruled_out: ['workmanship 0.5'],
        systemic: true,
        fleet_affected: 4,
        risk_score: 0.82,
        recommendation: 'DG swap + warranty reframe (spec) + cluster marine-grade',
        exposure_per_hr: 48000,
        eta_min: 95,
      },
    },
    log: { stage: 'investigate', source: 'Supervisor', text: 'Merged recommendation ready · risk 0.82', tone: 'agent' },
  },

  { at: 24000, event: { kind: 'stage.entered', stage: 'escalate' }, log: { stage: 'escalate', source: 'Maestro', text: 'Risk 0.82 ≥ 0.7 → human approval to call', tone: 'warn' } },
  {
    at: 24400,
    event: {
      kind: 'task.raised',
      task: { id: 'ACT-552', kind: 'approve_call', prompt: 'High risk (0.82) + ₹48k/hr exposure. Approve a voice call to the cluster manager to authorise the DG swap + warranty claim?', options: ['approve', 'hold'], status: 'pending' },
    },
    log: { stage: 'escalate', source: 'Action Center', text: 'Parked — approve the escalation call?', tone: 'warn' },
  },
  { at: 26800, event: { kind: 'task.answered', taskId: 'ACT-552', answer: 'approve', by: 'NOC duty officer' }, log: { stage: 'escalate', source: 'Action Center', text: 'Call approved', tone: 'ok' } },
  { at: 27300, event: { kind: 'call.started', to: '+91-98xxxxxx', toRole: 'NorthGrid cluster manager' }, log: { stage: 'escalate', source: 'Twilio Voice', text: 'Dialing the cluster manager…', tone: 'info' } },
  { at: 28800, event: { kind: 'call.connected' } },
  { at: 29200, event: { kind: 'call.line', line: { speaker: 'foreman', text: 'Hello, this is FOREMAN about Site DEL-0473. We have a confirmed non-marine RF cable spec defect plus a generator knock. SLA exposure is about forty-eight thousand rupees an hour.' } } },
  { at: 31200, event: { kind: 'call.line', line: { speaker: 'manager', text: 'Okay. What are you recommending?' } } },
  { at: 32600, event: { kind: 'call.line', line: { speaker: 'foreman', text: 'Swap the diesel generator now, and file a warranty claim against NorthGrid on a spec basis — the batch is non-marine in a coastal site. I can also cluster the marine-grade replacement.' } } },
  { at: 34600, event: { kind: 'call.line', line: { speaker: 'manager', text: 'Yes — swap the generator and file the NorthGrid claim. Approved.' } } },
  {
    at: 36000,
    event: { kind: 'call.decision', decision: { authorized: true, actions: ['dg_swap', 'warranty_claim'], by: 'cluster_manager', at: '14:32' } },
    log: { stage: 'escalate', source: 'Twilio Voice', text: 'Authorised by cluster manager at 14:32', tone: 'ok' },
  },

  { at: 37200, event: { kind: 'stage.entered', stage: 'resolve' }, log: { stage: 'resolve', source: 'Maestro', text: 'Entering Resolve — guarded BPMN writes', tone: 'info' } },
  {
    at: 37900,
    event: {
      kind: 'action.produced',
      artifact: {
        type: 'ticket',
        id: 'TKT-88142',
        title: 'ServiceNow ticket · P1',
        external: true,
        fields: { priority: '1 - Critical', site: 'DEL-0473', cause: 'spec defect (non-marine cable, coastal salt)', state: 'In Progress' },
      },
    },
    log: { stage: 'resolve', source: 'BPMN · raise_ticket', text: 'Real ServiceNow ticket TKT-88142 created (P1)', tone: 'ok' },
  },
  {
    at: 38900,
    event: {
      kind: 'action.produced',
      artifact: { type: 'work_order', id: 'WO-4471', title: 'Work order · DG swap', guard: 'authorized = true', fields: { type: 'dg_swap', site: 'DEL-0473', crew: 'CRW-WEST-2', eta_min: 95, authorized_by: 'cluster_manager' } },
    },
    log: { stage: 'resolve', source: 'BPMN · dispatch_dg_swap', text: 'WO-4471 dispatched (guard: authorized)', tone: 'ok' },
  },
  {
    at: 39900,
    event: {
      kind: 'action.produced',
      artifact: { type: 'warranty_claim', id: 'WC-2231', title: 'Warranty claim', guard: 'vendor_liable = true', fields: { asset: 'AST-RF-DEL-0473', vendor: 'NorthGrid', basis: 'spec defect within 90-day window', batch: 'NG-BATCH-22', amount_inr: 118000 } },
    },
    log: { stage: 'resolve', source: 'BPMN · file_warranty_claim', text: 'WC-2231 filed (guard: vendor_liable) · ₹1,18,000', tone: 'ok' },
  },
  {
    at: 40900,
    event: {
      kind: 'action.produced',
      artifact: { type: 'fleet_case', id: 'CASE-NG-BATCH-22', title: 'Fleet-review child case', fields: { type: 'fleet_review', batch: 'NG-BATCH-22', affected_sites: 'DEL-0473, MUM-0210, GOA-0188, KOC-0231' } },
    },
    log: { stage: 'resolve', source: 'BPMN · spawn_fleet_review', text: 'NOC notified · child case CASE-NG-BATCH-22 spawned', tone: 'info' },
  },

  { at: 42000, event: { kind: 'stage.entered', stage: 'close' }, log: { stage: 'close', source: 'Maestro', text: 'Entering Close — audit + learn', tone: 'info' } },
  {
    at: 42600,
    event: {
      kind: 'audit.ready',
      audit: {
        email: {
          to: 'om-team@operator; noc@operator; ops@northgrid',
          subject: '[CASE-0916] DEL-0473 resolved — spec defect, warranty claimed',
          body: 'Root cause: non-marine RF cable in a coastal site (confidence 0.90). Workmanship ruled out (0.5). Systemic: 4 sites on NG-BATCH-22.\nActions: TKT-88142, WO-4471 (DG swap), WC-2231 (warranty).\nSLA exposure avoided: ~₹48,000/hr. Authorised by voice: cluster manager, 14:32.',
        },
        attachments: ['clip.mp4', 'note.ogg', 'call-transcript.txt'],
      },
    },
    log: { stage: 'close', source: 'BPMN · audit', text: 'Audit pack assembled + emailed to O&M, NOC, NorthGrid', tone: 'ok' },
  },
  { at: 43400, event: { kind: 'graph.updated', note: 'Neo4j: Batch NG-BATCH-22 = failure_pattern · Site DEL-0473 = corroded' }, log: { stage: 'close', source: 'Neo4j', text: 'Graph updated — batch marked as a failure pattern', tone: 'info' } },
  { at: 44200, event: { kind: 'feedback', verdict: 'up' }, log: { stage: 'close', source: 'Human', text: '👍 Thumbs-up — learn from this case', tone: 'human' } },
  {
    at: 44800,
    event: {
      kind: 'skill.written',
      skill: {
        id: 'SK-coastal-rf-corrosion',
        match_key: { equipment_class: 'rf_jumper_cable', component: 'jumper', environment: 'coastal', spec: 'non-marine' },
        diagnosis: 'non-marine spec + salt air → spec defect, not workmanship',
        recipe: ['raise_ticket(P1)', 'warranty_claim(reframe:spec)', 'cluster_marine_grade'],
        status: 'candidate',
        approve_count: 1,
        source_cases: ['DEL-0473'],
        citations: ['rf-cable-spec-NG-22#p3', 'sla-master#c7'],
      },
    },
    log: { stage: 'close', source: 'Learning loop', text: 'New skill SK-coastal-rf-corrosion written (candidate · count 1)', tone: 'ok' },
  },
  { at: 45800, event: { kind: 'case.closed' }, log: { stage: 'close', source: 'Maestro', text: 'Case closed — documented and defensible', tone: 'ok' } },
]

export const scenarioA: Scenario = {
  id: 'A',
  case_id: 'CASE-0916',
  title: 'DEL-0473 · coastal RF corrosion + DG knock',
  subtitle: 'Nothing learned yet — the crew reasons from scratch',
  steps,
  durationMs: 47000,
}
