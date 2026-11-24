import type { Scenario, StationId, StationScript } from './types'

export interface Step {
  station: StationId
  script: StationScript
  pass: 1 | 2
  loopStart?: boolean
  /** Zusätzlicher Lesetext der Station (bei Prüfen im ersten Durchlauf: der Schleifengrund, bei Ergebnis: die Antwort). */
  extraText?: string
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
    const step: Step = { station: script.id, script, pass: 1 }
    if (s.schleife && script.id === 'pruefen') step.extraText = s.schleife.grund
    if (script.id === 'ergebnis') step.extraText = s.ergebnis
    steps.push(step)
  })
  return steps
}
