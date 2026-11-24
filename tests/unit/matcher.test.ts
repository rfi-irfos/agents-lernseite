import { describe, it, expect } from 'vitest'
import { matchScenario, wordCards } from '../../src/engine/matcher'
import { scenario } from './fixtures'

const mk = (id: string, kw: string[]) => ({ ...scenario(), id, stichwoerter: kw })
const all = [
  mk('wetter', ['wetter', 'regen', 'schirm']),
  mk('flugsuche', ['flug', 'fliegen', 'reise']),
  mk('programm', ['programm', 'code', 'schreib']),
  mk('foto', ['foto', 'pflanze', 'bild']),
  mk('ausflug', ['ausflug', 'plan', 'fuer']),
]

describe('matchScenario', () => {
  it('Treffer', () => {
    expect(matchScenario('Flug nach Berlin', all)).toMatchObject({ scenario: { id: 'flugsuche' }, beispiel: false })
    expect(matchScenario('PROGRAMM schreiben', all).scenario.id).toBe('programm')
    expect(matchScenario('Schulausflug nach Wien', all).scenario.id).toBe('ausflug')
  })
  it('kein Treffer ergibt wetter als Beispiel', () => {
    for (const t of ['', '   ', 'Wie spät ist es?']) {
      const r = matchScenario(t, all)
      expect(r.scenario.id).toBe('wetter')
      expect(r.beispiel).toBe(true)
    }
  })
  it('Umlaute normalisiert', () => {
    expect(matchScenario('Etwas für mich', all).scenario.id).toBe('ausflug')
    expect(matchScenario('Etwas fuer mich', all).scenario.id).toBe('ausflug')
  })
  it('Gleichstand: erster gewinnt', () => {
    expect(matchScenario('flug und foto', all).scenario.id).toBe('flugsuche')
  })
  it('mehr Treffer gewinnt', () => {
    expect(matchScenario('Foto Bild Flug', all).scenario.id).toBe('foto')
  })
})

describe('wordCards', () => {
  it('500 Zeichen ergeben 9 Einträge mit …', () => {
    const r = wordCards('wort '.repeat(100))
    expect(r).toHaveLength(9)
    expect(r[8]).toBe('…')
  })
  it('nur Leerzeichen', () => expect(wordCards('     ')).toEqual([]))
  it('Emoji bleiben', () => expect(wordCards('Hallo 🌧️ Welt')).toEqual(['Hallo', '🌧️', 'Welt']))
  it('Satzzeichen am Rand entfernt', () =>
    expect(wordCards('„Brauche ich morgen einen Schirm?“, (ja).')).toEqual(['Brauche', 'ich', 'morgen', 'einen', 'Schirm', 'ja']))
  it('genau max Wörter ohne …', () => expect(wordCards('a b c', 3)).toEqual(['a', 'b', 'c']))
  it('langes Wort bleibt ganz', () => expect(wordCards('x'.repeat(60))).toEqual(['x'.repeat(60)]))
})
