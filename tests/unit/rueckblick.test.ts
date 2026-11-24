import { describe, it, expect } from 'vitest'
import { VERLAEUFE, pathFor } from '../../src/scenes/rueckblick/besser'
import { de } from '../../src/content/de'

describe('Rückblick: Lernkurve', () => {
  it('Zabihs Werte stehen fest', () => {
    expect(VERLAEUFE.besser).toEqual([40, 55, 68, 78, 86, 92])
    expect(VERLAEUFE.gleich).toEqual([50, 50, 51, 50, 49, 50])
    expect(VERLAEUFE.schlechter).toEqual([60, 52, 44, 35, 27, 20])
  })
  it('alle Verläufe haben gleich viele Punkte, die Pfade also gleich viele Befehle', () => {
    const n = (v: number[]) => pathFor(v).split(/(?=[ML])/).length
    expect(n(VERLAEUFE.besser)).toBe(n(VERLAEUFE.gleich))
    expect(n(VERLAEUFE.besser)).toBe(n(VERLAEUFE.schlechter))
  })
  it('Merksatz wörtlich', () => {
    expect(`${de.rueckblick.besser.merke} ${de.rueckblick.besser.merksatz}`).toBe(
      'Merke: Ein Agent wird nur besser, wenn er Rückmeldung bekommt, sie speichert und beim nächsten Mal nutzt. Ohne Prüfung durch einen Menschen kann er auch schlechter werden.',
    )
  })
})

describe('Rückblick: Texte positiv formuliert', () => {
  it('die eigenen Sätze enthalten keine Verneinung', () => {
    const r = de.rueckblick
    const all = [
      r.weiter, r.kreislauf.intro, r.kreislauf.gedaechtnisText, ...Object.values(r.kreislauf.stationen),
      ...Object.values(r.besser.verlaeufe).flatMap((v) => [v.label, v.satz]), r.auswahl.titel,
    ].join(' ')
    expect(all).not.toMatch(/\b(nicht|kein\w*|ohne|nie|niemals|nichts)\b/i)
  })
})
