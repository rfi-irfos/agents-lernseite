import { describe, it, expect } from 'vitest'
import { scenarios } from '../../src/scenarios'
import { validateScenario } from '../../src/engine/validate'
import { matchScenario } from '../../src/engine/matcher'
import { parseHandelnDaten } from '../../src/engine/handeln'
import type { StationScript } from '../../src/engine/types'

const zeichnungen = Object.keys(import.meta.glob('../../src/svg/*.svg', { query: '?raw' }))
const byId = (id: string) => scenarios.find((s) => s.id === id)!
const alle = (s: (typeof scenarios)[number]): StationScript[] => [...s.stationen, ...(s.schleife?.zweiterDurchlauf ?? [])]

describe('scenarios', () => {
  it('fünf Abläufe, wetter ist zuerst', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['wetter', 'flugsuche', 'programm', 'foto', 'ausflug'])
  })
  for (const s of scenarios) {
    it(`${s.id} ist gültig`, () => expect(validateScenario(s)).toEqual([]))
    it(`${s.id}: jede Planung nennt ihre Schritte ausdrücklich`, () => {
      for (const p of alle(s).filter((x) => x.id === 'planung')) {
        const sch = p.daten?.schritte
        expect(Array.isArray(sch) && sch.length >= 2 && sch.every((x) => typeof x === 'string')).toBe(true)
      }
    })
  }
  it('wetter: kurzer Ablauf ohne Schleife, planung und pruefen kurz', () => {
    const w = byId('wetter')
    expect(w.schleife).toBeUndefined()
    expect(w.art).toBe('api')
    expect(w.stationen.filter((x) => x.kurz).map((x) => x.id)).toEqual(['planung', 'pruefen'])
  })
  it('Schleifen: flugsuche, programm und ausflug haben eine, wetter und foto nicht', () => {
    expect(scenarios.filter((s) => s.schleife).map((s) => s.id)).toEqual(['flugsuche', 'programm', 'ausflug'])
  })
  it('Arten nach Spec 6.4', () => {
    expect(scenarios.map((s) => s.art)).toEqual(['api', 'suche', 'code', 'bild', 'planung'])
  })
  it('programm: Test rot im ersten, grün im zweiten Durchlauf', () => {
    const p = byId('programm')
    const erst = parseHandelnDaten('code', p.stationen.find((x) => x.id === 'handeln')!.daten)!
    const zweit = parseHandelnDaten('code', p.schleife!.zweiterDurchlauf.find((x) => x.id === 'handeln')!.daten)!
    expect([erst.test.ok, zweit.test.ok]).toEqual([false, true])
  })
  it('foto: bild.src ist eine Zeichnung in src/svg', () => {
    const d = parseHandelnDaten('bild', byId('foto').stationen.find((x) => x.id === 'handeln')!.daten)!
    expect(zeichnungen).toContain(`../../src/svg/${d.src}.svg`)
  })
  it('ausflug hat ein Gedächtnis im ersten Durchlauf', () => {
    expect(byId('ausflug').stationen.some((x) => x.gedaechtnis)).toBe(true)
  })
  it('Beispielkarten: Text gleich der Aufgabe, eindeutige Aufgaben', () => {
    expect(new Set(scenarios.map((s) => s.aufgabe)).size).toBe(scenarios.length)
  })
  describe('Zuordnung freier Eingaben', () => {
    it('jede Aufgabe findet ihren eigenen Ablauf', () => {
      for (const s of scenarios) {
        expect(matchScenario(s.aufgabe, scenarios)).toMatchObject({ scenario: { id: s.id }, beispiel: false })
      }
    })
    it('zu breite Wörter lösen nichts aus', () => {
      for (const t of ['Guten Morgen', 'Es ist warm heute', 'kalt', 'Wie spät ist es?']) {
        expect(matchScenario(t, scenarios)).toMatchObject({ scenario: { id: 'wetter' }, beispiel: true })
      }
    })
    it('typische eigene Fragen', () => {
      const id = (t: string) => matchScenario(t, scenarios).scenario.id
      expect(id('Gibt es morgen Regen?')).toBe('wetter')
      expect(id('Finde einen Flug nach Rom')).toBe('flugsuche')
      expect(id('Schreib ein Programm für Hausaufgaben')).toBe('programm')
      expect(id('Welche Blume ist das auf dem Foto?')).toBe('foto')
      expect(id('Plane einen Ausflug in den Zoo')).toBe('ausflug')
    })
  })
})
