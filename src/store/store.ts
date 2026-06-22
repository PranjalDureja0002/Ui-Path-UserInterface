import { create } from 'zustand'
import type { CaseEvent, CaseView, LogEntry, Scenario, Skill } from '../types'
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

  while (i < scenario.steps.length && scenario.steps[i].at <= cursor) {
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
  return { scenarioId: id, cursorMs: 0, playing: false, speed: 1, finished: false, appliedIndex: 0, ...overrides }
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
        replay: freshReplay(id, { speed: s.replay.speed }),
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
    const dt = realDtMs * s.replay.speed
    let cursor = s.replay.cursorMs + dt
    let finished = false
    if (cursor >= scenario.durationMs) {
      cursor = scenario.durationMs
      finished = true
    }
    const patch = applyUpTo(s, scenario, s.activeCaseId, cursor)
    set({
      ...patch,
      replay: {
        ...(patch.replay ?? s.replay),
        cursorMs: cursor,
        playing: !finished,
        finished,
      },
    })
  },

  jumpToEnd: () => {
    const s = get()
    if (!s.activeCaseId) return
    const scenario = SCENARIOS[s.replay.scenarioId]
    const patch = applyUpTo(s, scenario, s.activeCaseId, scenario.durationMs)
    set({
      ...patch,
      replay: { ...(patch.replay ?? s.replay), cursorMs: scenario.durationMs, playing: false, finished: true },
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
