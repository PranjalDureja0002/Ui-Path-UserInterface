import type { Scenario } from '../types'
import { scenarioA } from './scenarioA'
import { scenarioB } from './scenarioB'
import { scenarioC } from './scenarioC'

export const SCENARIOS: Record<'A' | 'B' | 'C', Scenario> = {
  A: scenarioA,
  B: scenarioB,
  C: scenarioC,
}

// C (the MC4 solar cross-mating demo) leads — it's the headline case.
export const SCENARIO_LIST: Scenario[] = [scenarioC, scenarioA, scenarioB]
