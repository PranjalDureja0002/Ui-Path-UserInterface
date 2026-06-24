import type { Scenario, TimelineStep } from '../types'
import { AFFECTED_SITES, FLEET_EDGES, FLEET_NODES } from './fleet'

// ─────────────────────────────────────────────────────────────────────────────
// Scenario B — CASE-1042 · MUM-0210
// Ten days later a similar coastal site sends a similar clip. The matcher finds
// the candidate skill, it passes the hard gate, so FOREMAN proposes the fix
// immediately, cites DEL-0473, investigates only what differs, auto-resolves the
// routine fix (risk below the call threshold), and the skill is promoted to
// TRUSTED. Fast and cited — the contrast judges remember.
// ─────────────────────────────────────────────────────────────────────────────

const steps: TimelineStep[] = [
  {
    at: 0,
    event: {
      kind: 'case.opened',
      case: {
        case_id: 'CASE-1042',
        site_id: 'MUM-0210',
        title: 'RF jumper corrosion — coastal recurrence',
        worker_phone: '+91-9yyyyyyy',
        worker_name: 'S. Naik (field tech)',
        stage: 'intake',
        status: 'open',
        scenario: 'B',
        opened_at: '09:14',
        risk_score: null,
      },
    },
    log: { stage: 'intake', source: 'Maestro', text: 'Case CASE-1042 opened from WhatsApp trigger', tone: 'info' },
  },
  {
    at: 400,
    event: {
      kind: 'message',
      message: {
        id: 'm1',
        from: 'worker',
        text: 'Same green deposits on the RF jumper at MUM-0210. Looks like DEL last week. Clip attached.',
        ts: '09:14',
        media: [{ kind: 'video', label: 'clip-mum.mp4' }],
      },
    },
    log: { stage: 'intake', source: 'WhatsApp', text: 'Field tech reported corrosion with a clip', tone: 'human' },
  },
  { at: 1200, event: { kind: 'media.received', media: [{ kind: 'video', label: 'clip-mum.mp4' }] }, log: { stage: 'intake', source: 'Storage Bucket', text: 'Media saved → bucket://media/clip-mum.mp4', tone: 'ok' } },
  // ── CONFIRM (triage — acknowledge the report, authorise the analysis) ──────
  { at: 2000, event: { kind: 'stage.entered', stage: 'confirm' }, log: { stage: 'confirm', source: 'Maestro', text: 'Entering Confirm — triage the report (Action Center)', tone: 'info' } },
  {
    at: 2300,
    event: {
      kind: 'task.raised',
      task: { id: 'ACT-771', kind: 'confirm', prompt: 'Corrosion on the RF jumper at MUM-0210 — the tech flagged it looks like the DEL-0473 case. Confirm priority and authorise the analysis?', options: ['proceed', 'hold'], status: 'pending' },
    },
  },
  {
    at: 2600,
    event: {
      kind: 'message',
      message: { id: 'm2', from: 'foreman', text: 'Got it — green deposits on the MUM-0210 jumper, and you think it matches DEL-0473. Confirming priority and running the analysis now. OK to proceed?', ts: '09:14', options: ['Proceed', 'Hold'] },
    },
    log: { stage: 'confirm', source: 'Action Center', text: 'Parked — waiting for the tech to confirm priority', tone: 'warn' },
  },
  { at: 3800, event: { kind: 'task.answered', taskId: 'ACT-771', answer: 'Proceed', by: 'S. Naik' } },
  { at: 4000, event: { kind: 'message', message: { id: 'm3', from: 'worker', text: 'Yes, approve. 👍', ts: '09:14' } }, log: { stage: 'confirm', source: 'WhatsApp', text: 'Tech confirmed — proceeding to analysis', tone: 'human' } },

  // ── PERCEIVE (multimodal vision + skill match — seen this before) ──────────
  { at: 4600, event: { kind: 'stage.entered', stage: 'perceive' }, log: { stage: 'perceive', source: 'Maestro', text: 'Entering Perceive — Supervisor + Vision', tone: 'info' } },
  { at: 4800, event: { kind: 'agent.assembled', agent: 'vision' } },
  { at: 5000, event: { kind: 'agent.running', agent: 'vision' }, log: { stage: 'perceive', source: 'Vision · Gemini', text: 'Analysing the clip', tone: 'agent' } },
  {
    at: 6600,
    event: {
      kind: 'perception.ready',
      perception: { corrosion: { present: true, severity: 'medium-high' }, generator_audio: { anomaly: 'none', confidence: 0.0 }, issues: ['rf_cable_corrosion'] },
      asset_note: 'coastal site · 82% humidity · NorthGrid RF jumper',
    },
    log: { stage: 'perceive', source: 'Vision · Gemini', text: 'Corrosion present (medium-high)', tone: 'ok' },
  },
  { at: 6800, event: { kind: 'agent.completed', agent: 'vision', run: { headline: 'Corrosion present', detail: 'Green deposits at connector, matches the DEL pattern', confidence: 0.84 } } },
  {
    at: 7300,
    event: { kind: 'skill.matched', hit: { id: 'SK-coastal-rf-corrosion', status: 'candidate', source: 'DEL-0473' } },
    log: { stage: 'perceive', source: 'Context Grounding', text: '✦ Skill hit — seen this before (ref DEL-0473). Passed the hard gate.', tone: 'ok' },
  },

  { at: 9800, event: { kind: 'stage.entered', stage: 'investigate' }, log: { stage: 'investigate', source: 'Supervisor', text: 'Skill passed the gate → investigate only what differs', tone: 'agent' } },
  { at: 10000, event: { kind: 'agent.assembled', agent: 'entitlement' } },
  { at: 10200, event: { kind: 'agent.assembled', agent: 'rootcause' } },
  { at: 10400, event: { kind: 'agent.assembled', agent: 'fleet' } },
  { at: 10700, event: { kind: 'agent.running', agent: 'entitlement' } },
  { at: 10800, event: { kind: 'agent.running', agent: 'rootcause' } },
  { at: 10900, event: { kind: 'agent.running', agent: 'fleet' } },
  {
    at: 11400,
    event: { kind: 'agent.completed', agent: 'entitlement', run: { headline: 'Vendor liable · warranty active', detail: 'Same NG-BATCH-22 non-marine batch · vendor_liable = true', confidence: 0.96 } },
    log: { stage: 'investigate', source: 'Entitlement', text: 'vendor_liable = true (NG-BATCH-22)', tone: 'ok' },
  },
  {
    at: 12000,
    event: { kind: 'agent.completed', agent: 'rootcause', run: { headline: 'Spec defect — cites DEL-0473', detail: 'Same fingerprint as the trusted recipe; coastal + non-marine + 82% humidity', confidence: 0.88, citations: ['SK-coastal-rf-corrosion', 'case:DEL-0473', 'rf-cable-spec-NG-22#p3'] } },
    log: { stage: 'investigate', source: 'Root-cause', text: 'Spec defect (0.88) — cites the DEL-0473 recipe', tone: 'ok' },
  },
  {
    at: 12800,
    event: { kind: 'fleet.ready', fleet: { systemic: true, affected: AFFECTED_SITES, nodes: FLEET_NODES, edges: FLEET_EDGES } },
  },
  {
    at: 13000,
    event: { kind: 'agent.completed', agent: 'fleet', run: { headline: 'Already in the blast-radius', detail: 'MUM-0210 was flagged at-risk on the DEL-0473 fleet review; now confirmed corroded', confidence: 0.93 } },
    log: { stage: 'investigate', source: 'Fleet · Neo4j', text: 'MUM-0210 confirmed on the known failure pattern', tone: 'warn' },
  },
  { at: 13600, event: { kind: 'risk.scored', risk: 0.66 } },
  {
    at: 13900,
    event: {
      kind: 'investigation.ready',
      investigation: {
        root_cause: 'spec defect (non-marine cable, coastal salt air) — per SK-coastal-rf-corrosion',
        confidence: 0.88,
        alternatives_ruled_out: ['workmanship 0.4'],
        systemic: true,
        fleet_affected: 4,
        risk_score: 0.66,
        recommendation: 'Warranty reframe (spec) + cluster marine-grade — no generator involved',
        exposure_per_hr: 48000,
      },
    },
    log: { stage: 'investigate', source: 'Supervisor', text: 'Cited recommendation ready · risk 0.66', tone: 'agent' },
  },

  { at: 14600, event: { kind: 'stage.entered', stage: 'resolve' }, log: { stage: 'resolve', source: 'Maestro', text: 'Risk 0.66 < 0.7 → no call, auto-resolve the routine fix', tone: 'info' } },
  {
    at: 15200,
    event: { kind: 'action.produced', artifact: { type: 'ticket', id: 'TKT-88143', title: 'ServiceNow ticket · P2', external: true, fields: { priority: '2 - High', site: 'MUM-0210', cause: 'spec defect (non-marine cable, coastal salt)', state: 'In Progress' } } },
    log: { stage: 'resolve', source: 'BPMN · raise_ticket', text: 'Real ServiceNow ticket TKT-88143 created (P2)', tone: 'ok' },
  },
  {
    at: 16100,
    event: { kind: 'action.produced', artifact: { type: 'warranty_claim', id: 'WC-2232', title: 'Warranty claim', guard: 'vendor_liable = true', fields: { asset: 'AST-RF-MUM-0210', vendor: 'NorthGrid', basis: 'spec defect within 90-day window', batch: 'NG-BATCH-22', amount_inr: 96000 } } },
    log: { stage: 'resolve', source: 'BPMN · file_warranty_claim', text: 'WC-2232 filed (guard: vendor_liable) · ₹96,000', tone: 'ok' },
  },
  {
    at: 16900,
    event: { kind: 'action.produced', artifact: { type: 'noc', id: 'NOC-MUM-0210', title: 'Cluster marine-grade upgrade', fields: { action: 'cluster_marine_grade', batch_to: 'NG-BATCH-30', sites: 'GOA-0188, KOC-0231 queued' } } },
    log: { stage: 'resolve', source: 'BPMN · notify_noc', text: 'NOC queued the marine-grade cluster upgrade', tone: 'info' },
  },

  { at: 17800, event: { kind: 'stage.entered', stage: 'close' }, log: { stage: 'close', source: 'Maestro', text: 'Entering Close — audit + learn', tone: 'info' } },
  {
    at: 18300,
    event: {
      kind: 'audit.ready',
      audit: {
        email: {
          to: 'om-team@operator; noc@operator; ops@northgrid',
          subject: '[CASE-1042] MUM-0210 resolved — spec defect (cited DEL-0473)',
          body: 'Root cause: non-marine RF cable in a coastal site (confidence 0.88), cited from SK-coastal-rf-corrosion / DEL-0473.\nActions: TKT-88143, WC-2232 (warranty), marine-grade cluster upgrade queued.\nNo escalation call required (risk 0.66). Resolved in minutes via a trusted skill.',
        },
        attachments: ['clip-mum.mp4', 'skill-card.json'],
      },
    },
    log: { stage: 'close', source: 'BPMN · audit', text: 'Audit pack assembled + emailed', tone: 'ok' },
  },
  { at: 19000, event: { kind: 'graph.updated', note: 'Neo4j: Site MUM-0210 = corroded · NG-BATCH-22 failure pattern reinforced' }, log: { stage: 'close', source: 'Neo4j', text: 'Graph updated — MUM-0210 marked corroded', tone: 'info' } },
  { at: 19600, event: { kind: 'feedback', verdict: 'up' }, log: { stage: 'close', source: 'Human', text: '👍 Thumbs-up — confirm the skill', tone: 'human' } },
  {
    at: 20200,
    event: { kind: 'skill.promoted', skillId: 'SK-coastal-rf-corrosion', approve_count: 3, status: 'trusted' },
    log: { stage: 'close', source: 'Learning loop', text: 'approve_count = 3 → SK-coastal-rf-corrosion promoted to TRUSTED', tone: 'ok' },
  },
  { at: 21000, event: { kind: 'case.closed' }, log: { stage: 'close', source: 'Maestro', text: 'Case closed — fast, cited, defensible', tone: 'ok' } },
]

export const scenarioB: Scenario = {
  id: 'B',
  case_id: 'CASE-1042',
  title: 'MUM-0210 · coastal RF corrosion',
  subtitle: 'A similar issue is already learned — fast and cited',
  steps,
  durationMs: 22000,
}
