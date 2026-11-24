import type { Scenario, StationId, StationScript } from './types'

export interface Step {
  station: StationId
  script: StationScript
  pass: 1 | 2
  loopStart?: boolean
}

/** Flache Schrittliste. Der zweite Durchlauf sitzt vor `ergebnis`. */
export function buildSteps(s: Scenario): Step[] {
  const steps: Step[] = []
  const last = s.stationen.length - 1
  s.stationen.forEach((script, i) => {
    if (i === last && s.schleife) {
      s.schleife.zweiterDurchlauf.forEach((sc, j) => {
        const step: Step = { station: sc.id, script: sc, pass: 2 }
        if (j === 0) step.loopStart = true
        steps.push(step)
      })
    }
    steps.push({ station: script.id, script, pass: 1 })
  })
  return steps
}
