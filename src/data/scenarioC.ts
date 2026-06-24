import type { Scenario, TimelineStep } from '../types'
import { fleetMC4 } from './fleetMC4'

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C — CASE-PV-0758 · RJ-SOLAR-1 / string RJ-S12  (the live demo)
//
// A field engineer photographs a burned MC4 solar connector. FOREMAN has seen MC4
// burns before (a candidate skill, 2 prior cases), so it cites the recipe — then
// the Neo4j multi-factor blast-radius reveals the real story: the burns span THREE
// module batches but share one install crew + one connector lot. A "same batch"
// query would point at the wrong thing. Warranty/Entitlement is deliberately NOT
// assembled — this is workmanship, not a vendor spec defect. On the thumbs-up the
// skill is promoted candidate → trusted.
// ─────────────────────────────────────────────────────────────────────────────

const steps: TimelineStep[] = [
  // ── INTAKE ────────────────────────────────────────────────────────────────
  {
    at: 0,
    event: {
      kind: 'case.opened',
      case: {
        case_id: 'CASE-PV-0758',
        site_id: 'RJ-SOLAR-1',
        title: 'MC4 connector burn — solar string RJ-S12',
        worker_phone: '+91-9xxxxxxx',
        worker_name: 'A. Khan (field engineer)',
        stage: 'intake',
        status: 'open',
        scenario: 'C',
        opened_at: '11:04',
        risk_score: null,
      },
    },
    log: { stage: 'intake', source: 'Maestro', text: 'Case CASE-PV-0758 opened from WhatsApp trigger', tone: 'info' },
  },
  {
    at: 0,
    event: {
      kind: 'message',
      message: {
        id: 'm1',
        from: 'worker',
        text: 'String 12 at RJ-SOLAR-1 is underperforming — found a melted MC4 connector at the combiner. It is hot to touch. Photo + clip attached.',
        ts: '11:04',
        media: [
          { kind: 'video', label: 'mc4-burn.mp4' },
          { kind: 'image', label: 'mc4-closeup.jpg' },
          { kind: 'audio', label: 'voice-note.ogg' },
        ],
      },
    },
    log: { stage: 'intake', source: 'WhatsApp', text: 'Field engineer reported a burned connector with a clip', tone: 'human' },
  },
  {
    at: 0,
    event: {
      kind: 'media.received',
      media: [
        { kind: 'video', label: 'mc4-burn.mp4', duration: '0:18', meta: 'MP4 · 14.2 MB', note: 'Combiner walk-around — the melted MC4 at 0:11' },
        { kind: 'image', label: 'mc4-closeup.jpg', meta: 'JPG · 4032×3024', note: 'Melted housing, charred copper at the + contact' },
        { kind: 'image', label: 'thermal.jpg', meta: 'Thermal · FLIR', note: '82°C hot-spot vs 41°C ambient' },
        { kind: 'audio', label: 'voice-note.ogg', duration: '0:24', note: 'Burning smell; string reading zero since morning' },
        { kind: 'document', label: 'field-report.pdf', meta: '2 pages', note: 'On-site inspection form + string IV trace' },
      ],
    },
    log: { stage: 'intake', source: 'Storage Bucket', text: 'Media saved → bucket://media/ (5 items)', tone: 'ok' },
  },
  // ── CONFIRM (triage — acknowledge the report, authorise full analysis) ─────
  { at: 2600, event: { kind: 'stage.entered', stage: 'confirm' }, log: { stage: 'confirm', source: 'Maestro', text: 'Entering Confirm — triage the report (Action Center)', tone: 'info' } },
  {
    at: 3000,
    event: {
      kind: 'task.raised',
      task: {
        id: 'ACT-PV-12',
        kind: 'confirm',
        prompt: 'A melted MC4 connector on string RJ-S12 — hot to touch, with a photo, a thermal image and a clip. Confirm priority and authorise full analysis?',
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
        text: 'Got your report on RJ-S12 — a burned MC4, hot to touch. Confirming this as priority and starting the analysis now. OK to proceed?',
        ts: '11:05',
        options: ['Proceed', 'Hold'],
      },
    },
    log: { stage: 'confirm', source: 'Action Center', text: 'Parked — waiting for the engineer to confirm priority', tone: 'warn' },
  },
  { at: 5600, event: { kind: 'task.answered', taskId: 'ACT-PV-12', answer: 'Proceed', by: 'A. Khan' } },
  {
    at: 5800,
    event: { kind: 'message', message: { id: 'm3', from: 'worker', text: 'Yes — go ahead. It is hot to touch. 👍', ts: '11:05' } },
    log: { stage: 'confirm', source: 'WhatsApp', text: 'Engineer confirmed — proceeding to analysis', tone: 'human' },
  },

  // ── PERCEIVE (multimodal vision + skill match) ────────────────────────────
  { at: 6400, event: { kind: 'stage.entered', stage: 'perceive' }, log: { stage: 'perceive', source: 'Maestro', text: 'Entering Perceive — Diagnosis brain + Vision', tone: 'info' } },
  { at: 6800, event: { kind: 'agent.assembled', agent: 'supervisor' } },
  { at: 7000, event: { kind: 'agent.running', agent: 'supervisor' }, log: { stage: 'perceive', source: 'Diagnosis & Recommendation', text: 'Reading asset history + MC4 install spec + skills', tone: 'agent' } },
  { at: 7400, event: { kind: 'agent.assembled', agent: 'vision' } },
  { at: 7600, event: { kind: 'agent.running', agent: 'vision' }, log: { stage: 'perceive', source: 'Vision', text: 'Reading the photo + thermal — multi-frame', tone: 'agent' } },
  {
    // seed the already-learned candidate skill (2 prior MC4 burns on file)
    at: 8000,
    event: {
      kind: 'skill.written',
      skill: {
        id: 'SK-pv-mc4-connector-burn',
        match_key: {
          equipment_class: 'pv_string',
          component: 'mc4_connector',
          environment: 'rooftop',
          spec: 'cross_mated',
          failure_mode: 'connector_burn',
        },
        diagnosis: 'Mixed-brand MC4 mating → high contact resistance → thermal runaway → DC arc. Root is install workmanship, not the module batch.',
        recipe: ['isolate_string(DC_safe)', 'replace_connector(matched_brand)', 'audit_crew_installs', 'requalify_part_lot'],
        status: 'candidate',
        approve_count: 2,
        source_cases: ['RJ-S07', 'GJ-S03'],
        citations: ['mc4-connector-install-spec#crimp', 'pv-dc-arc-safety-bulletin#p1'],
      },
    },
    log: { stage: 'perceive', source: 'Context Grounding', text: 'Prior skill SK-pv-mc4-connector-burn on file (2 cases)', tone: 'info' },
  },
  {
    at: 10000,
    event: {
      kind: 'perception.ready',
      perception: {
        findings: [
          { modality: 'image', label: 'MC4 connector', detail: 'melted housing · thermal damage at + contact', severity: 'high', confidence: 0.95 },
          { modality: 'thermal', label: 'Hot-spot', detail: '82°C at connector vs 41°C ambient', severity: 'high', confidence: 0.9 },
        ],
        issues: ['mc4_connector_burn', 'dc_arc_risk'],
      },
      asset_note: 'AST-PV-RJ-S12 · SunVolt string · installed by CREW-PV-3 · connector lot MC4-LOT-X',
    },
    log: { stage: 'perceive', source: 'Vision', text: 'Melted MC4 housing · 82°C hot-spot · DC-arc risk', tone: 'danger' },
  },
  { at: 10200, event: { kind: 'agent.completed', agent: 'vision', run: { headline: 'Melted MC4 · 82°C hot-spot', detail: 'Thermal damage at the positive contact — consistent with high-resistance cross-mating', confidence: 0.95, citations: ['mc4-connector-install-spec#crimp'] } } },
  {
    at: 10700,
    event: { kind: 'skill.matched', hit: { id: 'SK-pv-mc4-connector-burn', status: 'candidate', source: 'RJ-S07' } },
    log: { stage: 'perceive', source: 'Context Grounding', text: 'Hard gate passed — matched SK-pv-mc4-connector-burn', tone: 'ok' },
  },
  { at: 11400, event: { kind: 'agent.completed', agent: 'supervisor', run: { headline: 'Cross-mated MC4 → DC arc risk', detail: 'Matched prior skill (2 cases). Hypothesis: install workmanship, not the module batch.', confidence: 0.93, citations: ['SK-pv-mc4-connector-burn', 'pv-dc-arc-safety-bulletin#p1'] } } },

  // ── INVESTIGATE (the dynamic crew — note Entitlement stays dim) ────────────
  { at: 12800, event: { kind: 'stage.entered', stage: 'investigate' }, log: { stage: 'investigate', source: 'Diagnosis & Recommendation', text: 'Assembling specialists — running in parallel', tone: 'agent' } },
  { at: 13100, event: { kind: 'agent.assembled', agent: 'rootcause' } },
  { at: 13400, event: { kind: 'agent.assembled', agent: 'fleet' } },
  {
    at: 13700,
    event: { kind: 'agent.assembled', agent: 'sla' },
    log: { stage: 'investigate', source: 'Supervisor', text: 'Warranty / Entitlement NOT assembled — workmanship, not a vendor spec defect', tone: 'info' },
  },
  { at: 14400, event: { kind: 'agent.running', agent: 'rootcause' } },
  { at: 14500, event: { kind: 'agent.running', agent: 'fleet' } },
  { at: 14600, event: { kind: 'agent.running', agent: 'sla' } },
  {
    at: 16600,
    event: {
      kind: 'agent.completed',
      agent: 'sla',
      run: { headline: 'Generation ₹9.2k/hr at risk · 6 strings', detail: 'Underperformance + isolation downtime across the at-risk strings', confidence: 0.85 },
    },
    log: { stage: 'investigate', source: 'Generation impact', text: 'Generation exposure ≈ ₹9,200/hr', tone: 'warn' },
  },
  {
    at: 18200,
    event: { kind: 'fleet.ready', fleet: fleetMC4 },
  },
  {
    at: 18500,
    event: {
      kind: 'agent.completed',
      agent: 'fleet',
      run: {
        headline: 'Systemic · 6 strings via crew + lot',
        detail: 'Cross-mating spans MOD-LOT-A/B/C but converges on CREW-PV-3 + MC4-LOT-X. A WHERE batch=X query finds 0 burns.',
        confidence: 0.94,
        citations: ['neo4j:multi-factor', 'neo4j:common-cause'],
      },
    },
    log: { stage: 'investigate', source: 'Fleet · Neo4j', text: 'Systemic — 6 strings share the crew + connector lot', tone: 'danger' },
  },
  {
    at: 20000,
    event: {
      kind: 'agent.completed',
      agent: 'rootcause',
      run: {
        headline: 'Cross-mated MC4 — install workmanship',
        detail: 'Mixed-brand mating → contact heating → DC arc. Module batch ruled out — a healthy string shares MOD-LOT-A.',
        confidence: 0.93,
        citations: ['mc4-connector-install-spec#crimp', 'connector-cross-mating-warning#p2'],
      },
    },
    log: { stage: 'investigate', source: 'Root-cause', text: 'Root cause: cross-mated MC4 (0.93); module batch ruled out', tone: 'ok' },
  },
  { at: 21000, event: { kind: 'risk.scored', risk: 0.88 } },
  {
    at: 21500,
    event: {
      kind: 'investigation.ready',
      investigation: {
        root_cause: 'cross-mated MC4 connectors (install workmanship) → contact heating → DC-arc risk',
        confidence: 0.93,
        alternatives_ruled_out: ['module batch defect 0.2', 'vendor spec defect — N/A (warranty not applicable)'],
        systemic: true,
        fleet_affected: 6,
        risk_score: 0.88,
        recommendation: 'isolate string DC-safe · matched-brand connector swap · audit CREW-PV-3 installs · requalify lot MC4-LOT-X',
        exposure_per_hr: 9200,
        eta_min: 70,
      },
    },
    log: { stage: 'investigate', source: 'Diagnosis & Recommendation', text: 'Merged recommendation ready · risk 0.88', tone: 'agent' },
  },

  // ── ESCALATE (safety-driven voice call) ───────────────────────────────────
  { at: 23000, event: { kind: 'stage.entered', stage: 'escalate' }, log: { stage: 'escalate', source: 'Maestro', text: 'Risk 0.88 ≥ 0.7 → human approval to call', tone: 'warn' } },
  {
    at: 23400,
    event: {
      kind: 'task.raised',
      task: { id: 'ACT-PV-13', kind: 'approve_call', prompt: 'High DC-arc risk (0.88) + 6 strings exposed. Approve a voice call to the site EPC manager to authorise isolation + a fleet crew audit?', options: ['approve', 'hold'], status: 'pending' },
    },
    log: { stage: 'escalate', source: 'Action Center', text: 'Parked — approve the escalation call?', tone: 'warn' },
  },
  { at: 25800, event: { kind: 'task.answered', taskId: 'ACT-PV-13', answer: 'approve', by: 'NOC duty officer' }, log: { stage: 'escalate', source: 'Action Center', text: 'Call approved', tone: 'ok' } },
  { at: 26300, event: { kind: 'call.started', to: '+91-98xxxxxx', toRole: 'Site EPC manager' }, log: { stage: 'escalate', source: 'Twilio Voice', text: 'Dialing the site EPC manager…', tone: 'info' } },
  { at: 27800, event: { kind: 'call.connected' } },
  { at: 28200, event: { kind: 'call.line', line: { speaker: 'foreman', text: 'This is FOREMAN about RJ-SOLAR-1, string 12. We found a melted MC4 connector with an 82-degree hot-spot — a DC-arc risk. The same install crew and connector lot affect six strings across the site.' } } },
  { at: 30400, event: { kind: 'call.line', line: { speaker: 'manager', text: 'Understood. What do you need?' } } },
  { at: 31800, event: { kind: 'call.line', line: { speaker: 'foreman', text: 'Isolate string twelve now, swap to matched-brand connectors, and let me raise a fleet audit on crew PV-3’s installs and requalify connector lot MC4-LOT-X.' } } },
  { at: 34000, event: { kind: 'call.line', line: { speaker: 'manager', text: 'Approved — isolate it and raise the crew audit.' } } },
  {
    at: 35400,
    event: { kind: 'call.decision', decision: { authorized: true, actions: ['isolate_string', 'crew_audit'], by: 'site_epc_manager', at: '11:09' } },
    log: { stage: 'escalate', source: 'Twilio Voice', text: 'Authorised by site EPC manager at 11:09', tone: 'ok' },
  },

  // ── RESOLVE (guarded writes — note: NO warranty claim) ─────────────────────
  { at: 36600, event: { kind: 'stage.entered', stage: 'resolve' }, log: { stage: 'resolve', source: 'Maestro', text: 'Entering Resolve — guarded BPMN writes', tone: 'info' } },
  {
    at: 37200,
    event: {
      kind: 'action.produced',
      artifact: { type: 'ticket', id: 'TKT-PV-7791', title: 'ServiceNow ticket · P1 safety', external: true, fields: { priority: '1 - Safety (DC arc)', site: 'RJ-SOLAR-1', cause: 'cross-mated MC4 → DC arc risk', state: 'In Progress' } },
    },
    log: { stage: 'resolve', source: 'BPMN · raise_ticket', text: 'Real ServiceNow ticket TKT-PV-7791 created (P1 safety)', tone: 'ok' },
  },
  {
    at: 38300,
    event: {
      kind: 'action.produced',
      artifact: { type: 'work_order', id: 'WO-PV-3312', title: 'Work order · isolate + matched-brand swap', guard: 'authorized = true', fields: { type: 'isolate_and_swap', site: 'RJ-SOLAR-1', crew: 'CRW-PV-RESP', eta_min: 70, authorized_by: 'site_epc_manager' } },
    },
    log: { stage: 'resolve', source: 'BPMN · dispatch_swap', text: 'WO-PV-3312 dispatched (guard: authorized)', tone: 'ok' },
  },
  {
    at: 39400,
    event: {
      kind: 'action.produced',
      artifact: { type: 'fleet_case', id: 'CASE-CREW-PV-3', title: 'Fleet crew-audit child case', fields: { type: 'crew_install_audit', crew: 'CREW-PV-3', lot: 'MC4-LOT-X', affected_strings: 'RJ-S12, RJ-S07, GJ-S03, GJ-S22, RJ-S15, GJ-S19' } },
    },
    log: { stage: 'resolve', source: 'BPMN · spawn_fleet_audit', text: 'NOC notified · child case CASE-CREW-PV-3 spawned', tone: 'info' },
  },

  // ── CLOSE (audit + learn → promote the skill) ─────────────────────────────
  { at: 40800, event: { kind: 'stage.entered', stage: 'close' }, log: { stage: 'close', source: 'Maestro', text: 'Entering Close — audit + learn', tone: 'info' } },
  {
    at: 41400,
    event: {
      kind: 'audit.ready',
      audit: {
        email: {
          to: 'om-team@operator; epc@solarco; hse@operator',
          subject: '[CASE-PV-0758] RJ-S12 resolved — cross-mated MC4, crew audit raised',
          body: 'Root cause: cross-mated MC4 connectors installed by CREW-PV-3 (confidence 0.93) → contact heating → DC-arc risk. Module batch ruled out (a healthy string shares MOD-LOT-A).\nSystemic: 6 strings via crew + connector lot MC4-LOT-X, across MOD-LOT-A/B/C.\nActions: TKT-PV-7791, WO-PV-3312 (isolate + matched-brand swap), CASE-CREW-PV-3 (fleet crew audit).\nNo warranty claim — workmanship, not a vendor spec defect.',
        },
        attachments: ['mc4-burn.mp4', 'string-iv-curve.png', 'thermal.jpg', 'call-transcript.txt'],
      },
    },
    log: { stage: 'close', source: 'BPMN · audit', text: 'Audit pack assembled + emailed to O&M, EPC, HSE', tone: 'ok' },
  },
  { at: 42200, event: { kind: 'graph.updated', note: 'Neo4j: CREW-PV-3 = systemic_root · MC4-LOT-X flagged requalify · 6 strings at_risk' }, log: { stage: 'close', source: 'Neo4j', text: 'Graph updated — crew + lot recorded as the systemic root', tone: 'info' } },
  { at: 43000, event: { kind: 'feedback', verdict: 'up' }, log: { stage: 'close', source: 'Human', text: '👍 Thumbs-up — learn from this case', tone: 'human' } },
  {
    at: 43600,
    event: { kind: 'skill.promoted', skillId: 'SK-pv-mc4-connector-burn', approve_count: 3, status: 'trusted' },
    log: { stage: 'close', source: 'Learning loop', text: 'SK-pv-mc4-connector-burn promoted candidate → trusted (count 3)', tone: 'ok' },
  },
  { at: 44600, event: { kind: 'case.closed' }, log: { stage: 'close', source: 'Maestro', text: 'Case closed — documented and defensible', tone: 'ok' } },
]

export const scenarioC: Scenario = {
  id: 'C',
  case_id: 'CASE-PV-0758',
  title: 'RJ-S12 · MC4 connector burn (solar)',
  subtitle: 'Seen before — cited, then the graph finds the cross-mating cluster',
  steps,
  durationMs: 46000,
}
