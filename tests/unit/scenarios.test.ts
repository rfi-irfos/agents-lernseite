import { describe, it, expect } from 'vitest'
import { scenarios } from '../../src/scenarios'
import { validateScenario } from '../../src/engine/validate'

describe('scenarios', () => {
  it('wetter ist zuerst', () => expect(scenarios[0].id).toBe('wetter'))
  for (const s of scenarios) {
    it(`${s.id} ist gültig`, () => expect(validateScenario(s)).toEqual([]))
  }
  it('wetter: kurzer Ablauf ohne Schleife, planung und pruefen kurz', () => {
    const w = scenarios[0]
    expect(w.schleife).toBeUndefined()
    expect(w.art).toBe('api')
    expect(w.stationen.filter((x) => x.kurz).map((x) => x.id)).toEqual(['planung', 'pruefen'])
  })
})
