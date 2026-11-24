import { describe, it, expect } from 'vitest'
import { validateScenario } from '../../src/engine/validate'
import { scenario, script, frage } from './fixtures'
import type { Scenario, StationId } from '../../src/engine/types'

const has = (s: Scenario, part: string) =>
  validateScenario(s).some((m) => m.toLowerCase().includes(part.toLowerCase()))

describe('validateScenario', () => {
  it('gültiges Szenario ergibt leere Liste', () => {
    expect(validateScenario(scenario())).toEqual([])
    expect(validateScenario(scenario(true))).toEqual([])
  })
  it('falsche Reihenfolge', () => {
    const s = scenario()
    ;[s.stationen[2], s.stationen[3]] = [s.stationen[3], s.stationen[2]]
    expect(has(s, 'Reihenfolge')).toBe(true)
  })
  it('fehlende Station', () => {
    const s = scenario()
    s.stationen = s.stationen.filter((x) => x.id !== 'planung')
    expect(has(s, 'Reihenfolge')).toBe(true)
  })
  it('keine Werkzeugfrage', () => {
    const s = scenario()
    delete s.stationen[4].werkzeug
    expect(has(s, 'genau eine')).toBe(true)
  })
  it('zwei Werkzeugfragen (auch im zweiten Durchlauf)', () => {
    const s = scenario(true)
    s.schleife!.zweiterDurchlauf[2].werkzeug = frage
    expect(has(s, 'genau eine')).toBe(true)
  })
  it('richtig außerhalb 0–2', () => {
    const s = scenario()
    s.stationen[4].werkzeug = { ...frage, richtig: 3 as unknown as 0 }
    expect(has(s, 'richtig')).toBe(true)
  })
  it('mehr als ein Satz', () => {
    const s = scenario()
    s.stationen[0].text = 'Eins. Zwei.'
    expect(has(s, 'Satz')).toBe(true)
  })
  it('ein Satz mit Schlusspunkt und Auslassung ist erlaubt', () => {
    const s = scenario()
    s.stationen[0].text = 'Ich überlege kurz… dann los.'
    expect(validateScenario(s)).toEqual([])
  })
  it('mehr als 18 Wörter', () => {
    const s = scenario()
    s.stationen[1].text = Array(19).fill('wort').join(' ')
    expect(has(s, 'Wörter')).toBe(true)
    s.stationen[1].text = Array(18).fill('wort').join(' ')
    expect(validateScenario(s)).toEqual([])
  })
  it('tiefer 2–4 Einträge', () => {
    const s = scenario()
    s.stationen[2].tiefer = ['a']
    expect(has(s, 'tiefer')).toBe(true)
    s.stationen[2].tiefer = ['a', 'b', 'c', 'd', 'e']
    expect(has(s, 'tiefer')).toBe(true)
    s.stationen[2].tiefer = ['a', 'b']
    expect(validateScenario(s)).toEqual([])
  })
  it('zweiter Durchlauf muss mit denken beginnen und mit pruefen enden', () => {
    const s = scenario(true)
    s.schleife!.zweiterDurchlauf = s.schleife!.zweiterDurchlauf.slice(1)
    expect(has(s, 'Durchlauf')).toBe(true)
    const t = scenario(true)
    t.schleife!.zweiterDurchlauf = t.schleife!.zweiterDurchlauf.slice(0, 4)
    expect(has(t, 'Durchlauf')).toBe(true)
    const u = scenario(true)
    u.schleife!.zweiterDurchlauf = (['denken', 'werkzeug', 'planung', 'handeln', 'pruefen'] as StationId[]).map((i) => script(i))
    expect(has(u, 'Durchlauf')).toBe(true)
  })
  it('Fachwörter in text, ganzes Wort, ohne Groß-/Kleinschreibung', () => {
    for (const w of ['LLM', 'API', 'Token', 'Prompt', 'api']) {
      const s = scenario()
      s.stationen[0].text = `Wir nutzen eine ${w} heute`
      expect(has(s, 'Fachwort')).toBe(true)
    }
    const s = scenario()
    s.stationen[0].text = 'Die Kapitel sind apart'
    expect(validateScenario(s)).toEqual([])
    s.stationen[0].tiefer = ['Ein API ist wie eine Tür.', 'Zweiter Satz.']
    expect(validateScenario(s)).toEqual([])
  })
})
