import type { Scenario, TimelineStep } from '../types'
import { fleetMC4 } from './fleetMC4'

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C — CASE-PV-0758 · RJ-SOLAR-1 / string RJ-S12  (the live demo)
//
// Flow:
//   1. INTAKE     — field engineer reports on WhatsApp (Hinglish) + a 20s clip.
//   2. CONFIRM    — FOREMAN completeness check: it asks for the Asset ID; the
//                   engineer replies; FOREMAN grounds the asset and says it's
//                   analysing. (No Action Center here — a WhatsApp Q&A.)
//   3. PERCEIVE   — multimodal vision reads the clip/thermal; the prior MC4 skill
//                   is matched (candidate, 2 cases).
//   4. INVESTIGATE— the Supervisor assembles the dynamic crew; root-cause + the
//                   Neo4j blast-radius land; FOREMAN replies on WhatsApp with the
//                   RCA, the recommendation and the SOP PDF.
//   5. ESCALATE   — risk 0.88 (> 0.8) → Action Center routes the NOC operator
//                   (Yes,call / Handle digitally / Hold). NOC picks "Yes, call" →
//                   a two-way voice call to the site manager authorises the fix.
//   6. RESOLVE    — guarded writes (ticket, work order, fleet crew-audit). No
//                   warranty claim — workmanship, not a vendor defect.
//   7. CLOSE      — audit email to everyone; the graph records the systemic root;
//                   the human thumbs-up promotes the skill candidate → trusted.
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
        text: 'Sir ye MC4 connector fir se kharab — copper wire bahar nikla hua hai, contact bilkul loose hai. 20 second ka video bhej raha hoon.',
        ts: '11:04',
        media: [{ kind: 'video', label: 'mc4-burn.mp4', duration: '0:20' }],
      },
    },
    log: { stage: 'intake', source: 'WhatsApp', text: 'Field engineer reported a damaged MC4 connector + a 20s clip', tone: 'human' },
  },
  {
    at: 600,
    event: {
      kind: 'media.received',
      media: [
        { kind: 'video', label: 'mc4-burn.mp4', duration: '0:20', meta: 'MP4 · 15.1 MB', note: 'Combiner walk-around — melted MC4 at 0:11; loose contact, exposed copper' },
        { kind: 'image', label: 'mc4-frame.jpg', meta: 'frame @ 0:11 · 1080p', note: 'Extracted frame — melted housing, charred copper at the + contact' },
        { kind: 'image', label: 'thermal-est.jpg', meta: 'thermal estimate', note: '≈82°C hot-spot at the connector vs ≈41°C ambient' },
        { kind: 'audio', label: 'clip-audio.ogg', duration: '0:20', note: 'Engineer narration — burning smell; string reading zero since morning' },
        { kind: 'document', label: 'field-report.pdf', meta: '2 pages', note: 'Auto-drafted inspection form + string IV trace' },
      ],
    },
    log: { stage: 'intake', source: 'Storage Bucket', text: 'Clip saved + frames / thermal / audio extracted (5 items)', tone: 'ok' },
  },

  // ── CONFIRM (completeness check — FOREMAN needs the Asset ID) ───────────────
  { at: 2200, event: { kind: 'stage.entered', stage: 'confirm' }, log: { stage: 'confirm', source: 'Maestro', text: 'Entering Confirm — completeness check', tone: 'info' } },
  {
    at: 2600,
    event: {
      kind: 'message',
      message: {
        id: 'm2',
        from: 'foreman',
        text: 'Thanks for flagging this — FOREMAN here. To pull up the right asset history and SOP before I run the analysis, please share the Asset ID first.',
        ts: '11:04',
      },
    },
    log: { stage: 'confirm', source: 'FOREMAN', text: 'Completeness check — requested the Asset ID', tone: 'agent' },
  },
  {
    at: 4600,
    event: { kind: 'message', message: { id: 'm3', from: 'worker', text: 'Asset ID: AST-PV-RJ-S12', ts: '11:05' } },
    log: { stage: 'confirm', source: 'WhatsApp', text: 'Engineer sent the Asset ID — AST-PV-RJ-S12', tone: 'human' },
  },
  {
    at: 5300,
    event: {
      kind: 'message',
      message: {
        id: 'm4',
        from: 'foreman',
        text: 'Got it — AST-PV-RJ-S12. FOREMAN is analysing your report now (multimodal vision + the specialist crew). Please wait a moment…',
        ts: '11:05',
      },
    },
    log: { stage: 'confirm', source: 'FOREMAN', text: 'Asset grounded — engine activated, analysing the request', tone: 'ok' },
  },

  // ── PERCEIVE (multimodal vision + skill match) ────────────────────────────
  { at: 6400, event: { kind: 'stage.entered', stage: 'perceive' }, log: { stage: 'perceive', source: 'Maestro', text: 'Entering Perceive — Diagnosis brain + Vision', tone: 'info' } },
  { at: 6800, event: { kind: 'agent.assembled', agent: 'supervisor' } },
  { at: 7000, event: { kind: 'agent.running', agent: 'supervisor' }, log: { stage: 'perceive', source: 'Diagnosis & Recommendation', text: 'Reading asset history (AST-PV-RJ-S12) + MC4 install spec + skills', tone: 'agent' } },
  { at: 7400, event: { kind: 'agent.assembled', agent: 'vision' } },
  { at: 7600, event: { kind: 'agent.running', agent: 'vision' }, log: { stage: 'perceive', source: 'Vision', text: 'Reading the clip frames + thermal — multi-frame', tone: 'agent' } },
  {
    at: 10000,
    event: {
      kind: 'perception.ready',
      perception: {
        findings: [
          { modality: 'image', label: 'MC4 connector', detail: 'melted housing · thermal damage at + contact · exposed copper', severity: 'high', confidence: 0.95 },
          { modality: 'thermal', label: 'Hot-spot', detail: '≈82°C at connector vs ≈41°C ambient', severity: 'high', confidence: 0.9 },
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
    log: { stage: 'perceive', source: 'Context Grounding', text: 'Hard gate passed — matched prior skill SK-pv-mc4-connector-burn (candidate · 2 cases)', tone: 'ok' },
  },
  {
    // RECALL (not a new write): the skill already exists from 2 prior cases. It's
    // pulled into the working set here so it can be cited now and PROMOTED to
    // trusted later — only on the human thumbs-up.
    at: 10750,
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
    log: { stage: 'perceive', source: 'Context Grounding', text: 'Recalled the cited recipe (candidate · 2 cases) into the working set', tone: 'info' },
  },
  { at: 11400, event: { kind: 'agent.completed', agent: 'supervisor', run: { headline: 'Cross-mated MC4 → DC arc risk', detail: 'Matched prior skill (2 cases). Hypothesis: install workmanship, not the module batch.', confidence: 0.93, citations: ['SK-pv-mc4-connector-burn', 'pv-dc-arc-safety-bulletin#p1'] } } },

  // ── INVESTIGATE (the dynamic crew — note Entitlement stays dim) ────────────
  { at: 12800, event: { kind: 'stage.entered', stage: 'investigate' }, log: { stage: 'investigate', source: 'Diagnosis & Recommendation', text: 'Supervisor assembling specialists — running in parallel', tone: 'agent' } },
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
  { at: 18200, event: { kind: 'fleet.ready', fleet: fleetMC4 } },
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
  {
    // RCA + recommendation + SOP PDF back to the field engineer on WhatsApp
    at: 22300,
    event: {
      kind: 'message',
      message: {
        id: 'm5',
        from: 'foreman',
        text: 'Analysis complete for AST-PV-RJ-S12.\n\nRoot cause: cross-mated MC4 connectors (install workmanship) → contact heating → DC-arc risk. Module batch ruled out.\n\n⚠️ Action: isolate string 12 DC-safe first, then swap to matched-brand connectors. Do NOT touch the live connector.\n\nFleet: the same install crew + connector lot affect 6 strings — a crew audit is being raised.\n\nStep-by-step SOP attached.',
        ts: '11:07',
        media: [{ kind: 'document', label: 'SOP-mc4-isolate-swap.pdf', meta: '3 pages', note: 'IEC 62852 / NEC 690 — DC-safe isolation + matched-brand swap' }],
      },
    },
    log: { stage: 'investigate', source: 'WhatsApp', text: 'RCA + recommendation + SOP sent to the field engineer', tone: 'ok' },
  },

  // ── ESCALATE (risk 0.88 > 0.8 → Action Center → NOC → two-way call) ─────────
  { at: 23200, event: { kind: 'stage.entered', stage: 'escalate' }, log: { stage: 'escalate', source: 'Maestro', text: 'Risk 0.88 ≥ 0.8 → Action Center (NOC operator)', tone: 'warn' } },
  {
    at: 23600,
    event: {
      kind: 'task.raised',
      task: {
        id: 'ACT-PV-13',
        kind: 'approve_call',
        prompt: 'High DC-arc risk (0.88) on RJ-SOLAR-1 — 6 strings exposed via the same install crew + connector lot. How should FOREMAN proceed?',
        options: ['Yes, call', 'Handle digitally', 'Hold'],
        status: 'pending',
      },
    },
    log: { stage: 'escalate', source: 'Action Center', text: 'NOC operator notified — awaiting routing decision', tone: 'warn' },
  },
  { at: 26000, event: { kind: 'task.answered', taskId: 'ACT-PV-13', answer: 'Yes, call', by: 'NOC operator' }, log: { stage: 'escalate', source: 'Action Center', text: 'NOC chose: call the site manager to authorise', tone: 'ok' } },
  { at: 26500, event: { kind: 'call.started', to: '+91-98xxxxxx', toRole: 'Site EPC manager' }, log: { stage: 'escalate', source: 'Twilio Voice', text: 'Dialing the site EPC manager…', tone: 'info' } },
  { at: 28000, event: { kind: 'call.connected' } },
  { at: 28400, event: { kind: 'call.line', line: { speaker: 'foreman', text: 'This is FOREMAN about RJ-SOLAR-1, string 12. We found a melted MC4 connector with an 82-degree hot-spot — a DC-arc risk. The same install crew and connector lot affect six strings across the site.' } } },
  { at: 30600, event: { kind: 'call.line', line: { speaker: 'manager', text: 'Understood. What do you need?' } } },
  { at: 32000, event: { kind: 'call.line', line: { speaker: 'foreman', text: 'Isolate string twelve now, swap to matched-brand connectors, and let me raise a fleet audit on crew PV-3’s installs and requalify connector lot MC4-LOT-X.' } } },
  { at: 34200, event: { kind: 'call.line', line: { speaker: 'manager', text: 'Approved — isolate it and raise the crew audit.' } } },
  {
    at: 35400,
    event: { kind: 'call.decision', decision: { authorized: true, actions: ['isolate_string', 'crew_audit'], by: 'site_epc_manager', at: '11:09' } },
    log: { stage: 'escalate', source: 'Twilio Voice', text: 'Authorised by site EPC manager at 11:09', tone: 'ok' },
  },

  // ── RESOLVE (guarded writes — note: NO warranty claim) ─────────────────────
  { at: 36600, event: { kind: 'stage.entered', stage: 'resolve' }, log: { stage: 'resolve', source: 'Maestro', text: 'Entering Resolve — guarded downstream writes', tone: 'info' } },
  {
    at: 37200,
    event: {
      kind: 'action.produced',
      artifact: { type: 'ticket', id: 'TKT-PV-7791', title: 'ServiceNow ticket · P1 safety', external: true, fields: { priority: '1 - Safety (DC arc)', site: 'RJ-SOLAR-1', cause: 'cross-mated MC4 → DC arc risk', state: 'In Progress' } },
    },
    log: { stage: 'resolve', source: 'Action · raise_ticket', text: 'Real ServiceNow ticket TKT-PV-7791 created (P1 safety)', tone: 'ok' },
  },
  {
    at: 38300,
    event: {
      kind: 'action.produced',
      artifact: { type: 'work_order', id: 'WO-PV-3312', title: 'Work order · isolate + matched-brand swap', guard: 'authorized = true', fields: { type: 'isolate_and_swap', site: 'RJ-SOLAR-1', crew: 'CRW-PV-RESP', eta_min: 70, authorized_by: 'site_epc_manager' } },
    },
    log: { stage: 'resolve', source: 'Action · dispatch_swap', text: 'WO-PV-3312 dispatched (guard: authorized)', tone: 'ok' },
  },
  {
    at: 39400,
    event: {
      kind: 'action.produced',
      artifact: { type: 'fleet_case', id: 'CASE-CREW-PV-3', title: 'Fleet crew-audit child case', fields: { type: 'crew_install_audit', crew: 'CREW-PV-3', lot: 'MC4-LOT-X', affected_strings: 'RJ-S12, RJ-S07, GJ-S03, GJ-S22, RJ-S15, GJ-S19' } },
    },
    log: { stage: 'resolve', source: 'Action · spawn_fleet_audit', text: 'NOC notified · child case CASE-CREW-PV-3 spawned', tone: 'info' },
  },

  // ── CLOSE (audit + email to all → learn → promote the skill) ───────────────
  { at: 40800, event: { kind: 'stage.entered', stage: 'close' }, log: { stage: 'close', source: 'Maestro', text: 'Entering Close — audit + learn', tone: 'info' } },
  {
    at: 41400,
    event: {
      kind: 'audit.ready',
      audit: {
        email: {
          to: 'A. Khan (field engineer) · NOC operator · site EPC manager · O&M team · HSE',
          subject: '[CASE-PV-0758] RJ-S12 resolved — cross-mated MC4, crew audit raised',
          body: 'Summary of the episode for everyone involved.\n\nReport: field engineer A. Khan flagged a melted MC4 connector on string RJ-S12 (RJ-SOLAR-1) over WhatsApp with a 20s clip.\nRoot cause: cross-mated MC4 connectors installed by CREW-PV-3 (confidence 0.93) → contact heating → DC-arc risk. Module batch ruled out (a healthy string shares MOD-LOT-A).\nSystemic: 6 strings via crew + connector lot MC4-LOT-X, across MOD-LOT-A/B/C.\nDecision: NOC routed to a voice call; site EPC manager authorised isolation + a fleet crew audit at 11:09.\nActions: TKT-PV-7791 (P1), WO-PV-3312 (isolate + matched-brand swap), CASE-CREW-PV-3 (fleet crew audit).\nNo warranty claim — workmanship, not a vendor spec defect.',
        },
        attachments: ['mc4-burn.mp4', 'mc4-frame.jpg', 'thermal-est.jpg', 'SOP-mc4-isolate-swap.pdf', 'call-transcript.txt'],
      },
    },
    log: { stage: 'close', source: 'Action · audit', text: 'Audit pack assembled + emailed to field eng, NOC, manager, O&M, HSE', tone: 'ok' },
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
  subtitle: 'WhatsApp report → completeness check → analysis → SOP → NOC call → learn',
  steps,
  durationMs: 46000,
}
