import type { Scenario } from '../../src/engine/types'

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
      { id: 'handeln', text: 'Er führt den Plan aus.' },
      { id: 'pruefen', text: 'Er prüft das Ergebnis.' },
      { id: 'ergebnis', text: 'Die Antwort ist fertig.' },
    ],
    ergebnis: 'Fertig.',
  },
]
