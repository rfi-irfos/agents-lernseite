import { describe, it, expect } from 'vitest'
import { buildSteps } from '../../src/engine/steps'
import { scenario } from './fixtures'

describe('buildSteps', () => {
  it('ohne Schleife: 8 Schritte in Stationsreihenfolge', () => {
    const s = buildSteps(scenario())
    expect(s.map((x) => x.station)).toEqual([
      'eingabe', 'wahrnehmung', 'denken', 'planung', 'werkzeug', 'handeln', 'pruefen', 'ergebnis',
    ])
    expect(s.every((x) => x.pass === 1 && !x.loopStart)).toBe(true)
  })
  it('mit Schleife: 13 Schritte, Index 7 ist denken pass 2 loopStart, Ende ergebnis', () => {
    const s = buildSteps(scenario(true))
    expect(s).toHaveLength(13)
    expect(s[7]).toMatchObject({ station: 'denken', pass: 2, loopStart: true })
    expect(s[8].loopStart).toBeUndefined()
    expect(s.slice(7, 12).every((x) => x.pass === 2)).toBe(true)
    expect(s[12].station).toBe('ergebnis')
    expect(s[12].pass).toBe(1)
  })
  it('zweiter Durchlauf hat keine Mitmach-Frage (R2)', () => {
    const s = buildSteps(scenario(true))
    expect(s.filter((x) => x.script.werkzeug)).toHaveLength(1)
  })
  it('pruefen im ersten Durchlauf trägt den Schleifengrund als extraText', () => {
    const s = buildSteps(scenario(true))
    expect(s.filter((x) => x.extraText)).toHaveLength(1)
    expect(s.find((x) => x.extraText)).toMatchObject({ station: 'pruefen', pass: 1, extraText: 'Nochmal' })
    expect(buildSteps(scenario()).some((x) => x.extraText)).toBe(false)
  })
})
