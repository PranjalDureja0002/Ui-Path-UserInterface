import type { Scenario } from '../types'
import { scenarioA } from './scenarioA'
import { scenarioB } from './scenarioB'

export const SCENARIOS: Record<'A' | 'B', Scenario> = {
  A: scenarioA,
  B: scenarioB,
}

export const SCENARIO_LIST: Scenario[] = [scenarioA, scenarioB]
