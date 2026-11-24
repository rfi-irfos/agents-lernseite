import { describe, it, expect } from 'vitest'
import { sentences, checkScenario, repeatedTrigrams, collect, handelnTexte } from '../../scripts/copy-lib'
import { scenario } from './fixtures'
import { scenarios } from '../../src/scenarios'

const funde = (text: string, regel: string) => {
  const s = scenario()
  s.stationen[0].text = text
  return checkScenario(s).filter((f) => f.regel === regel && f.wo.endsWith('/eingabe'))
}

describe('Satzerkennung', () => {
  it('ein Satz mit Schlusspunkt', () => expect(sentences('Das ist ein Satz.')).toHaveLength(1))
  it('zwei Sätze', () => expect(sentences('Eins. Zwei!')).toHaveLength(2))
  it('Schlusszeichen mit schließendem Anführungszeichen', () => {
    expect(sentences('Er sagt „Los.“')).toHaveLength(1)
    expect(sentences('Er sagt „Los!“ Dann geht er.')).toHaveLength(2)
  })
  it('Abkürzung „z. B.“ beendet keinen Satz', () => {
    expect(sentences('Viele Tiere, z. B. Hunde, laufen gern.')).toHaveLength(1)
    expect(sentences('Das gilt d. h. für alle.')).toHaveLength(1)
  })
  it('Dezimalzahlen und Prozent', () => {
    expect(sentences('Es sind 3,5 Kilometer und 80 % Regen.')).toHaveLength(1)
    expect(sentences('Version 3.5 ist da.')).toHaveLength(1)
  })
  it('Auslassung am Ende', () => expect(sentences('Ich überlege …')).toHaveLength(1))
})

describe('Regeln', () => {
  it('19 Wörter melden, 18 nicht', () => {
    expect(funde(Array(19).fill('wort').join(' '), 'Satzlänge')).toHaveLength(1)
    expect(funde(Array(18).fill('wort').join(' '), 'Satzlänge')).toHaveLength(0)
  })
  it('Länge zählt je Satz, auch in tiefer', () => {
    const s = scenario()
    s.stationen[1].tiefer = [`${Array(19).fill('wort').join(' ')}.`, 'Kurz.']
    expect(checkScenario(s).some((f) => f.regel === 'Satzlänge' && f.wo.includes('tiefer 1'))).toBe(true)
  })
  it('Zahlen wie 3,5 und 80 % verfälschen die Satzlänge nicht', () => {
    expect(funde('Das sind 3,5 Kilometer bei 80 % Regen heute.', 'Satzlänge')).toHaveLength(0)
  })
  it('Fachwörter im Plural im Text', () => {
    for (const w of ['Tokens', 'Prompts', 'LLMs', 'APIs']) expect(funde(`Wir nutzen ${w} heute`, 'Fachwort')).toHaveLength(1)
  })
  it('Fachwort in tiefer ist erlaubt', () => {
    const s = scenario()
    s.stationen[1].tiefer = ['Ein API ist eine Tür für Programme.', 'Zweiter Satz.']
    expect(checkScenario(s).filter((f) => f.regel === 'Fachwort')).toHaveLength(0)
  })
  it('Verneinungen', () => {
    for (const t of ['Das ist nicht nur schön sondern gut', 'Er geht ohne Schirm', 'Das gibt es nie', 'Keine Angst', 'mehr als nur ein Wort'])
      expect(funde(t, 'Verneinung').length).toBeGreaterThan(0)
    expect(funde('Er nimmt einen Schirm mit', 'Verneinung')).toHaveLength(0)
  })
  it('ASCII-Ersatz für Umlaute', () => {
    expect(funde('Das ist fuer dich', 'Umlaut')).toHaveLength(1)
    expect(funde('Er geht zurueck', 'Umlaut')).toHaveLength(1)
    expect(funde('Das ist für dich', 'Umlaut')).toHaveLength(0)
  })
  it('gratis und kostenlos', () => {
    expect(funde('Das ist kostenlos', 'Gratis')).toHaveLength(1)
    expect(funde('Das ist gratis', 'Gratis')).toHaveLength(1)
  })
  it('wiederholte Dreiwortfolge in zwei Texten', () => {
    const r = repeatedTrigrams([
      { wo: 'a', art: 'text', text: 'Das Wetter von morgen ist wichtig' },
      { wo: 'b', art: 'tiefer', text: 'Wer das Wetter von morgen kennt, packt richtig' },
    ])
    expect(r.map((x) => x.folge)).toContain('wetter von morgen')
  })
  it('Füllwortfolgen zählen nicht', () => {
    const r = repeatedTrigrams([
      { wo: 'a', art: 'text', text: 'Er ist in der Stadt' },
      { wo: 'b', art: 'text', text: 'Sie ist in der Schule' },
    ])
    expect(r).toEqual([])
  })
  it('sammelt Texte, Schritte, Erklärung und Schleifengrund', () => {
    const u = collect(scenarios.find((x) => x.id === 'flugsuche')!)
    expect(u.some((x) => x.wo.includes('Schleifengrund'))).toBe(true)
    expect(u.some((x) => x.wo.includes('Schritt 1'))).toBe(true)
    expect(u.some((x) => x.wo.includes('Erklärung'))).toBe(true)
  })
})

describe('Handeln-Daten auf dem Bildschirm', () => {
  const mitDaten = (art: 'suche' | 'api' | 'code' | 'bild' | 'planung', daten: Record<string, unknown>) => {
    const s = scenario()
    s.art = art
    s.stationen[5].daten = daten
    return s
  }
  it('Fachwort, Verneinung, ASCII-Umlaut und gratis in Treffern werden gefunden', () => {
    const f = checkScenario(mitDaten('suche', { treffer: [{ titel: 'Ein API Treffer', detail: 'keine Umstiege fuer dich, gratis' }] }))
    const regeln = f.filter((x) => x.wo.includes('Treffer')).map((x) => x.regel)
    expect(regeln).toEqual(expect.arrayContaining(['Fachwort', 'Verneinung', 'Umlaut', 'Gratis']))
  })
  it('api, Marker und Route werden geprüft', () => {
    expect(checkScenario(mitDaten('api', { anfrage: 'Tokens bitte', antwort: 'ok' })).some((x) => x.wo.includes('Anfrage'))).toBe(true)
    expect(checkScenario(mitDaten('bild', { src: 'pflanze', markierungen: [{ x: 1, y: 1, label: 'ohne Blatt' }] })).some((x) => x.wo.includes('Markierung'))).toBe(true)
    expect(checkScenario(mitDaten('planung', { punkte: [{ ort: 'Zug fuer alle', zeit: '8:00' }] })).some((x) => x.wo.includes('Halt 1 Ort'))).toBe(true)
  })
  it('Codezeilen stehen im Prüfblatt, werden aber nicht geprüft; der Testname schon', () => {
    const s = mitDaten('code', { zeilen: ['print(nie, fuer, API)'], test: { name: 'Test ohne Fehler', ok: true } })
    expect(handelnTexte('code', s.stationen[5].daten).map((x) => x.wo)).toEqual(['Codezeile 1', 'Testname'])
    const f = checkScenario(s).filter((x) => x.wo.includes('handeln/'))
    expect(f.some((x) => x.wo.includes('Codezeile'))).toBe(false)
    expect(f.some((x) => x.wo.includes('Testname') && x.regel === 'Verneinung')).toBe(true)
  })
  it('echte Daten erscheinen in collect', () => {
    const u = collect(scenarios.find((x) => x.id === 'ausflug')!)
    expect(u.some((x) => x.wo.includes('Halt 1 Ort'))).toBe(true)
  })
})

describe('echte Abläufe', () => {
  for (const s of scenarios) it(`${s.id}: 0 Funde`, () => expect(checkScenario(s)).toEqual([]))
})
