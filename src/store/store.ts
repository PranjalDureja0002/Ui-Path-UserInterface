import { create } from 'zustand'
import type { CaseEvent, CaseView, LogEntry, Scenario, Skill, TimelineStep } from '../types'
import { SCENARIOS } from '../data/scenarios'
import { demoClock } from '../lib/format'
import { FEED_MODE } from '../config'
import { applySkillEvent, blankCase, emptyCase, reduceCase } from './reducer'

let logSeq = 0
function makeLog(entry: Omit<LogEntry, 'id'>): LogEntry {
  logSeq += 1
  return { ...entry, id: `log-${logSeq}` }
}

interface ReplayState {
  scenarioId: 'A' | 'B' | 'C'
  cursorMs: number
  playing: boolean
  speed: number
  finished: boolean
  appliedIndex: number
  // The replay HOLDS at the learning tail (graph.updated → feedback → skill → close)
  // until the human gives feedback. gateIndex marks that held step; awaitingFeedback
  // is true while the case waits at the gate.
  gateIndex: number | null
  awaitingFeedback: boolean
}

interface ForemanState {
  cases: Record<string, CaseView>
  order: string[]
  activeCaseId: string | null
  skills: Record<string, Skill>
  replay: ReplayState

  // actions
  loadScenario: (id: 'A' | 'B' | 'C') => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  restart: () => void
  setSpeed: (s: number) => void
  advance: (realDtMs: number) => void
  jumpToEnd: () => void
  selectCase: (caseId: string) => void
  resetAll: () => void
  // LIVE feed seam: apply one CaseEvent pushed from the view-backend.
  ingestEvent: (caseId: string, event: CaseEvent) => void
  // Human-in-the-loop: the thumbs-up/down at the learning gate. Fires the held
  // learning cascade (graph + skill) live, staggered so it's visible across tabs.
  submitFeedback: (verdict: 'up' | 'down') => void
}

function activeCase(get: () => ForemanState): CaseView | null {
  const { activeCaseId, cases } = get()
  return activeCaseId ? cases[activeCaseId] ?? null : null
}

// Apply scenario steps whose `at` <= cursor and index >= appliedIndex.
function applyUpTo(
  state: ForemanState,
  scenario: Scenario,
  caseId: string,
  cursor: number,
): Partial<ForemanState> {
  let caseObj = state.cases[caseId]
  let skills = state.skills
  let i = state.replay.appliedIndex
  let mutated = false

  // Never auto-apply the held learning tail — it waits for human feedback.
  const limit = state.replay.gateIndex ?? scenario.steps.length
  while (i < limit && scenario.steps[i].at <= cursor) {
    const step = scenario.steps[i]
    caseObj = reduceCase(caseObj, step.event, step.at)
    skills = applySkillEvent(skills, step.event)
    if (step.log) {
      caseObj = {
        ...caseObj,
        log: [...caseObj.log, makeLog({ ...step.log, ts: step.log.ts ?? demoClock(step.at) })],
      }
    }
    mutated = true
    i += 1
  }

  if (!mutated) return {}
  return {
    cases: { ...state.cases, [caseId]: caseObj },
    skills,
    replay: { ...state.replay, appliedIndex: i },
  }
}

function freshReplay(id: 'A' | 'B' | 'C', overrides: Partial<ReplayState> = {}): ReplayState {
  return {
    scenarioId: id,
    cursorMs: 0,
    playing: false,
    speed: 1,
    finished: false,
    appliedIndex: 0,
    gateIndex: null,
    awaitingFeedback: false,
    ...overrides,
  }
}

// The learning gate: anchor on the (single) feedback step, and pull in a
// graph.updated that sits immediately before it — so on the thumbs-up the KG
// note AND the skill both appear live, while early skill-writes stay unaffected.
function findGate(scenario: Scenario): number | null {
  const fb = scenario.steps.findIndex((st) => st.event.kind === 'feedback')
  if (fb < 0) return null
  let start = fb
  while (start - 1 >= 0 && scenario.steps[start - 1].event.kind === 'graph.updated') start -= 1
  return start
}

export const useStore = create<ForemanState>((set, get) => ({
  cases: {},
  order: [],
  activeCaseId: null,
  skills: {},
  replay: freshReplay('C'),

  loadScenario: (id) => {
    const scenario = SCENARIOS[id]
    const caseId = scenario.case_id
    set((s) => {
      const order = s.order.includes(caseId) ? s.order : [...s.order, caseId]
      return {
        cases: { ...s.cases, [caseId]: emptyCase(scenario) },
        order,
        activeCaseId: caseId,
        replay: freshReplay(id, { speed: s.replay.speed, gateIndex: findGate(scenario) }),
      }
    })
    // apply the t=0 step(s) so the case appears immediately
    const s = get()
    const patch = applyUpTo(s, scenario, caseId, 0)
    if (Object.keys(patch).length) set(patch)
  },

  play: () => set((s) => ({ replay: { ...s.replay, playing: true, finished: false } })),
  pause: () => set((s) => ({ replay: { ...s.replay, playing: false } })),
  togglePlay: () => {
    const { replay, restart } = get()
    if (replay.finished) {
      restart()
      // start playing right after restart
      set((s) => ({ replay: { ...s.replay, playing: true } }))
      return
    }
    set((s) => ({ replay: { ...s.replay, playing: !s.replay.playing } }))
  },

  restart: () => {
    const { replay } = get()
    get().loadScenario(replay.scenarioId)
  },

  setSpeed: (speed) => set((s) => ({ replay: { ...s.replay, speed } })),

  advance: (realDtMs) => {
    const s = get()
    if (!s.replay.playing || !s.activeCaseId) return
    const scenario = SCENARIOS[s.replay.scenarioId]
    const gate = s.replay.gateIndex
    const gateAt = gate != null ? scenario.steps[gate].at : Infinity
    const dt = realDtMs * s.replay.speed
    let cursor = s.replay.cursorMs + dt
    let awaiting = false
    let finished = false
    if (cursor >= gateAt) {
      cursor = gateAt
      awaiting = true // hold at the human-feedback gate
    } else if (cursor >= scenario.durationMs) {
      cursor = scenario.durationMs
      finished = true
    }
    const patch = applyUpTo(s, scenario, s.activeCaseId, cursor)
    set({
      ...patch,
      replay: {
        ...(patch.replay ?? s.replay),
        cursorMs: cursor,
        playing: !awaiting && !finished,
        awaitingFeedback: awaiting,
        finished,
      },
    })
  },

  jumpToEnd: () => {
    const s = get()
    if (!s.activeCaseId) return
    const scenario = SCENARIOS[s.replay.scenarioId]
    const gate = s.replay.gateIndex
    // Skip straight to the decision point (the gate), not past it.
    const target = gate != null ? scenario.steps[gate].at : scenario.durationMs
    const patch = applyUpTo(s, scenario, s.activeCaseId, target)
    set({
      ...patch,
      replay: {
        ...(patch.replay ?? s.replay),
        cursorMs: target,
        playing: false,
        awaitingFeedback: gate != null,
        finished: gate == null,
      },
    })
  },

  // Human-in-the-loop feedback. Fires the held learning cascade live: the thumb
  // lights, then ~step-by-step the KG note and the skill appear, then the case
  // closes — so the active-learning loop is visible across the Audit/Skills/Fleet tabs.
  submitFeedback: (verdict) => {
    const s = get()
    const caseId = s.activeCaseId
    if (!caseId) return
    const cur = s.cases[caseId]
    if (!cur || cur.feedback) return // already decided
    const gate = s.replay.gateIndex
    const scenario = SCENARIOS[s.replay.scenarioId]

    let ordered: TimelineStep[]
    if (gate != null) {
      const held = scenario.steps.slice(gate)
      const fbIdx = held.findIndex((st) => st.event.kind === 'feedback')
      if (verdict === 'up') {
        // feedback first (so the thumb lights), then graph.updated → skill → close
        const fb = fbIdx >= 0 ? [held[fbIdx]] : []
        const rest = held.filter((_, i) => i !== fbIdx)
        ordered = [...fb, ...rest]
      } else {
        // thumbs-down: record the verdict, skip graph + skill, then close
        const closed = held.find((st) => st.event.kind === 'case.closed')
        ordered = [
          {
            at: held[fbIdx]?.at ?? 0,
            event: { kind: 'feedback', verdict: 'down' },
            log: {
              stage: 'close',
              source: 'Human',
              text: '👎 Thumbs-down — kept as a counter-example, skill not learned',
              tone: 'human',
            },
          },
          ...(closed ? [closed] : []),
        ]
      }
    } else {
      // live mode: record the verdict locally; real learning events stream from the agent
      ordered = [{ at: 0, event: { kind: 'feedback', verdict } }]
    }

    set((st) => ({ replay: { ...st.replay, awaitingFeedback: false, playing: false } }))

    ordered.forEach((step, idx) => {
      setTimeout(() => {
        set((st) => {
          const c0 = st.cases[caseId]
          if (!c0) return {}
          let caseObj = reduceCase(c0, step.event, performance.now())
          const skills = applySkillEvent(st.skills, step.event)
          if (step.log) {
            caseObj = {
              ...caseObj,
              log: [...caseObj.log, makeLog({ ...step.log, ts: step.log.ts ?? demoClock(step.at) })],
            }
          }
          const isLast = idx === ordered.length - 1
          return {
            cases: { ...st.cases, [caseId]: caseObj },
            skills,
            replay: isLast && gate != null
              ? { ...st.replay, finished: true, appliedIndex: scenario.steps.length, cursorMs: scenario.durationMs }
              : st.replay,
          }
        })
      }, idx * 850)
    })
  },

  selectCase: (caseId) => set({ activeCaseId: caseId }),

  resetAll: () => set({ cases: {}, order: [], activeCaseId: null, skills: {}, replay: freshReplay('A') }),

  // LIVE: apply a single CaseEvent pushed from the backend. Creates the case on
  // first sight, appends explicit log events, and keeps the skills map in sync —
  // the exact same reducer the replay engine uses, so the UI renders identically.
  ingestEvent: (caseId, event) =>
    set((s) => {
      let cases = s.cases
      let order = s.order
      if (!cases[caseId]) {
        cases = { ...cases, [caseId]: blankCase(caseId) }
        order = order.includes(caseId) ? order : [...order, caseId]
      }
      let caseObj = reduceCase(cases[caseId], event, performance.now())
      if (event.kind === 'log') {
        caseObj = { ...caseObj, log: [...caseObj.log, makeLog({ ...event.entry })] }
      }
      const skills = applySkillEvent(s.skills, event)
      return {
        cases: { ...cases, [caseId]: caseObj },
        order,
        skills,
        activeCaseId: s.activeCaseId ?? caseId,
      }
    }),
}))

// Demo mode pre-loads Scenario A (paused) so the dashboard has a case ready.
// Live mode starts empty and fills in as real CaseEvents arrive over WebSocket.
if (FEED_MODE === 'demo') {
  useStore.getState().loadScenario('C')
}

// ── Selectors / hooks ───────────────────────────────────────────────────────
export function useActiveCase(): CaseView | null {
  return useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] ?? null : null))
}
export { activeCase }
