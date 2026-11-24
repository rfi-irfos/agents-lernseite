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
  describe('handeln daten je art', () => {
    it('fehlende daten im ersten Durchlauf', () => {
      const s = scenario()
      delete s.stationen[5].daten
      expect(has(s, 'daten')).toBe(true)
    })
    it('fehlende daten im zweiten Durchlauf', () => {
      const s = scenario(true)
      delete s.schleife!.zweiterDurchlauf[3].daten
      expect(has(s, 'zweiter Durchlauf')).toBe(true)
    })
    it('Szenario ohne handeln-Station meldet auch fehlende daten nicht doppelt, aber die Reihenfolge', () => {
      const s = scenario()
      s.stationen = s.stationen.filter((x) => x.id !== 'handeln')
      expect(has(s, 'Reihenfolge')).toBe(true)
      expect(has(s, 'handeln: daten')).toBe(true)
    })
    const mit = (art: Scenario['art'], daten: Record<string, unknown>) => {
      const s = scenario()
      s.art = art
      s.stationen[5].daten = daten
      return s
    }
    it('passende Formen sind gültig', () => {
      expect(validateScenario(mit('suche', { treffer: [{ titel: 'a', detail: 'b' }] }))).toEqual([])
      expect(validateScenario(mit('api', { anfrage: 'a', antwort: 'b' }))).toEqual([])
      expect(validateScenario(mit('code', { zeilen: ['x'], test: { name: 't', ok: true } }))).toEqual([])
      expect(validateScenario(mit('bild', { src: 'pflanze', markierungen: [{ x: 1, y: 2, label: 'l' }] }))).toEqual([])
      expect(validateScenario(mit('planung', { punkte: [{ ort: 'Graz', zeit: '8:00' }] }))).toEqual([])
    })
    it('falsche Form für die Art', () => {
      expect(has(mit('suche', { anfrage: 'a', antwort: 'b' }), 'passen nicht zur Art')).toBe(true)
      expect(has(mit('code', { zeilen: ['x'], test: { name: 't' } }), 'passen nicht zur Art')).toBe(true)
      expect(has(mit('planung', { punkte: [{ ort: 1, zeit: 'x' }] }), 'passen nicht zur Art')).toBe(true)
    })
    it('bild: keine Adresse im Netz', () => {
      for (const src of ['https://example.com/a.png', '//cdn/x.svg', 'a/b.svg']) {
        expect(has(mit('bild', { src, markierungen: [] }), 'passen nicht zur Art')).toBe(true)
      }
    })
    it('zweiter Durchlauf wird mitgeprüft', () => {
      const s = scenario(true)
      s.art = 'api'
      s.stationen[5].daten = { anfrage: 'a', antwort: 'b' }
      s.schleife!.zweiterDurchlauf[3].daten = { treffer: [] }
      expect(has(s, 'zweiter Durchlauf')).toBe(true)
    })
  })
})
