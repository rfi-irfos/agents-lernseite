import type { Art, HandelnDaten, Scenario, StationScript } from '../../src/engine/types'

/** Prüfablauf für die Stationen-Tests: Gedächtnis, Plankarten und eine Schleife. Nur mit ?test=1&fixtures=1. */
export const fixtureScenarios: Scenario[] = [
  {
    id: 'fix-stationen',
    titel: 'Teststationen',
    aufgabe: 'zzfix Plan für den Ausflug',
    art: 'planung',
    stichwoerter: ['zzfix'],
    stationen: [
      { id: 'eingabe', text: 'Du gibst dem Agenten eine Aufgabe.' },
      { id: 'wahrnehmung', text: 'Er liest den Satz Wort für Wort.' },
      {
        id: 'denken',
        text: 'Er überlegt, welcher Weg am besten passt, und denkt an letztes Mal.',
        gedaechtnis: 'Letztes Mal war der Zug am Morgen am schnellsten.',
      },
      {
        id: 'planung',
        text: 'Sein Plan hat drei Schritte, einen nach dem anderen.',
        daten: { schritte: ['Zug suchen', 'Preis vergleichen', 'Antwort schreiben'] },
      },
      {
        id: 'werkzeug',
        text: 'Dafür greift er zum richtigen Werkzeug.',
        werkzeug: {
          frage: 'Welches Werkzeug passt?',
          karten: [
            { icon: 'rechner', label: 'Taschenrechner' },
            { icon: 'wetter', label: 'Wetterdienst' },
            { icon: 'album', label: 'Fotoalbum' },
          ],
          richtig: 1,
          erklaerung: 'Der Wetterdienst kennt das Wetter, die anderen beiden können das nicht.',
        },
      },
      { id: 'handeln', text: 'Er führt den Plan aus.', daten: { punkte: [{ ort: 'Graz', zeit: '08:00' }] } },
      { id: 'pruefen', text: 'Er prüft das Ergebnis.' },
      { id: 'ergebnis', text: 'Die Antwort ist fertig.' },
    ],
    ergebnis: 'Fertig.',
  },
]

const wahl = (richtig: 0 | 1 | 2) => ({
  frage: 'Welches Werkzeug passt?',
  karten: [
    { icon: 'rechner', label: 'Taschenrechner' },
    { icon: 'wetter', label: 'Wetterdienst' },
    { icon: 'album', label: 'Fotoalbum' },
  ] as [
    { icon: string; label: string },
    { icon: string; label: string },
    { icon: string; label: string },
  ],
  richtig,
  erklaerung: 'Dieses Werkzeug passt am besten zur Aufgabe.',
})

function handelnAblauf(
  id: string,
  art: Art,
  daten: HandelnDaten,
  schleife?: { grund: string; daten: HandelnDaten },
): Scenario {
  const st = (sid: StationScript['id'], text: string, extra: Partial<StationScript> = {}): StationScript => ({ id: sid, text, ...extra })
  return {
    id,
    titel: id,
    aufgabe: `${id} Aufgabe`,
    art,
    stichwoerter: [id.replace('fix-', 'zz')],
    stationen: [
      st('eingabe', 'Du gibst dem Agenten eine Aufgabe.'),
      st('wahrnehmung', 'Er liest den Satz Wort für Wort.'),
      st('denken', 'Er überlegt, welcher Weg am besten passt.'),
      st('planung', 'Sein Plan hat wenige Schritte.', { kurz: true }),
      st('werkzeug', 'Dafür greift er zum richtigen Werkzeug.', { werkzeug: wahl(1) }),
      st('handeln', 'Er führt den Plan aus.', { daten }),
      st('pruefen', 'Er vergleicht das Ergebnis mit deiner Aufgabe.'),
      st('ergebnis', 'Hier steht die fertige Antwort für dich.'),
    ],
    ...(schleife
      ? {
          schleife: {
            grund: schleife.grund,
            zweiterDurchlauf: [
              st('denken', 'Er überlegt noch einmal anders.'),
              st('planung', 'Sein neuer Plan ist kurz.', { kurz: true }),
              st('werkzeug', 'Er greift erneut zum Werkzeug.', { kurz: true }),
              st('handeln', 'Er versucht es noch einmal.', { daten: schleife.daten }),
              st('pruefen', 'Jetzt passt das Ergebnis zur Aufgabe.'),
            ],
          },
        }
      : {}),
    ergebnis: `Antwort ${id}: Das ist das fertige Ergebnis für dich.`,
  }
}

/** Je eine Handeln-Variante, dazu ein Code-Ablauf mit Schleife und ein API-Ablauf mit Schleife. */
export const handelnFixtures: Scenario[] = [
  handelnAblauf('fix-suche', 'suche', {
    treffer: [
      { titel: 'Erster Treffer', detail: 'Direktflug am Freitag' },
      { titel: 'Zweiter Treffer', detail: 'Mit Umstieg, etwas billiger' },
      { titel: 'Dritter Treffer', detail: 'Abends, sehr günstig' },
    ],
  }),
  handelnAblauf('fix-api', 'api', { anfrage: 'Wetterdienst, wie wird morgen das Wetter?', antwort: 'Morgen regnet es.' }),
  handelnAblauf(
    'fix-code',
    'code',
    {
      zeilen: ['def sortiere(liste):', '    return liste.sort()', 'print(sortiere(["b", "a"]))'],
      test: { name: 'test_sortiere', ok: false },
    },
    {
      grund: 'Der Test ist durchgefallen, also denkt der Agent noch einmal nach.',
      daten: {
        zeilen: ['def sortiere(liste):', '    return sorted(liste)', 'print(sortiere(["b", "a"]))'],
        test: { name: 'test_sortiere', ok: true },
      },
    },
  ),
  handelnAblauf('fix-bild', 'bild', {
    src: 'pflanze',
    markierungen: [
      { x: 50, y: 40, label: 'Blatt' },
      { x: 30, y: 70, label: 'Stiel' },
    ],
  }),
  handelnAblauf('fix-planung', 'planung', {
    punkte: [
      { ort: 'Graz', zeit: '08:00' },
      { ort: 'Semmering', zeit: '09:30' },
      { ort: 'Wien', zeit: '11:00' },
    ],
  }),
  handelnAblauf(
    'fix-schleife',
    'api',
    { anfrage: 'Wetterdienst, wie wird morgen das Wetter?', antwort: 'Keine Angabe.' },
    {
      grund: 'Die Antwort sagt nichts zum Schirm, also fragt der Agent genauer nach.',
      daten: { anfrage: 'Wetterdienst, regnet es morgen in Graz?', antwort: 'Ja, es regnet.' },
    },
  ),
]
