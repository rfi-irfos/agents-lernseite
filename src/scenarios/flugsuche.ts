import type { Scenario } from '../engine/types'

export const flugsuche: Scenario = {
  id: 'flugsuche',
  titel: 'Flug suchen',
  aufgabe: 'Finde mir den günstigsten Flug von Graz nach Berlin am Freitag.',
  art: 'suche',
  stichwoerter: ['flug', 'flieg', 'flughafen', 'ticket', 'umstieg', 'abflug'],
  stationen: [
    {
      id: 'eingabe',
      text: 'Du bittest den Agenten, den günstigsten Flug von Graz nach Berlin am Freitag zu finden.',
    },
    {
      id: 'wahrnehmung',
      text: 'Er zerlegt deinen Satz und merkt sich: Flug, Graz, Berlin, Freitag und günstig.',
      tiefer: [
        'Der Agent liest jedes Wort einzeln, so wie du beim Lesen Wort für Wort.',
        'Orte und Tage verraten ihm, wohin und wann du fliegen willst.',
      ],
    },
    {
      id: 'denken',
      text: 'Er überlegt: Viele Flüge vergleiche ich am schnellsten mit einer Flugsuche.',
      tiefer: [
        'Ein Agent spielt im Kopf mehrere Wege durch und wählt einen davon.',
        'Dabei hilft ihm ein Sprachmodell, das ist ein Computerprogramm, das aus sehr vielen Texten gelernt hat.',
      ],
    },
    {
      id: 'planung',
      text: 'Sein Plan: Flüge für Freitag suchen, die Preise vergleichen und den günstigsten auswählen.',
      daten: { schritte: ['Flüge für Freitag suchen', 'Preise vergleichen', 'Günstigsten auswählen'] },
    },
    {
      id: 'werkzeug',
      text: 'Dafür greift er zur Flugsuche, die alle Abflüge auf einmal zeigt.',
      tiefer: [
        'Jedes Werkzeug kann etwas anderes, so wie ein Hammer und eine Säge.',
        'Der Agent wählt das Werkzeug, das zur Aufgabe passt.',
      ],
      werkzeug: {
        frage: 'Welches Werkzeug findet Flüge zwischen zwei Städten?',
        karten: [
          { icon: 'rechner', label: 'Taschenrechner' },
          { icon: 'flug', label: 'Flugsuche' },
          { icon: 'wetter', label: 'Wetterdienst' },
        ],
        richtig: 1,
        erklaerung:
          'Die Flugsuche kennt alle Abflüge und ihre Preise. Der Taschenrechner rechnet nur, und der Wetterdienst kennt die Wolken.',
      },
    },
    {
      id: 'handeln',
      text: 'Die Flugsuche liefert die Abflüge des Tages, sortiert nach dem Preis.',
      tiefer: [
        'Jeder Treffer nennt die Uhrzeit, den Preis und die Zahl der Umstiege.',
        'Der Agent blättert die Liste durch wie du eine Speisekarte.',
      ],
      daten: {
        treffer: [
          { titel: 'Graz nach Berlin, 06:10 Uhr', detail: '89 Euro, zwei Umstiege' },
          { titel: 'Graz nach Berlin, 07:35 Uhr', detail: '97 Euro, zwei Umstiege' },
          { titel: 'Graz nach Berlin, 11:20 Uhr', detail: '104 Euro, ein Umstieg' },
        ],
      },
    },
    {
      id: 'pruefen',
      text: 'Er prüft das Ergebnis: Beim billigsten Flug müsstest du zweimal umsteigen.',
    },
    {
      id: 'ergebnis',
      text: 'Zum Schluss schreibt der Agent dir seine Antwort.',
    },
  ],
  schleife: {
    grund: 'Das dauert den halben Tag, darum geht er zurück zum Denken und sucht einen direkten Flug.',
    zweiterDurchlauf: [
      {
        id: 'denken',
        text: 'Jetzt überlegt er neu: Ein direkter Flug ist etwas teurer, spart aber viele Stunden.',
        tiefer: [
          'Der Kreislauf aus Denken, Handeln und Prüfen ist das Besondere an einem Agenten.',
          'Er darf seinen ersten Plan ändern, wenn das Ergebnis schlecht aussieht.',
        ],
      },
      {
        id: 'planung',
        text: 'Neuer Plan: direkte Flüge am Freitag suchen und danach den Preis prüfen.',
        daten: { schritte: ['Direkte Flüge suchen', 'Preis prüfen'] },
      },
      {
        id: 'werkzeug',
        text: 'Er nimmt dieselbe Flugsuche und stellt sie auf direkte Flüge ein.',
      },
      {
        id: 'handeln',
        text: 'Die Suche zeigt jetzt drei direkte Flüge, und der günstigste kostet 119 Euro.',
        daten: {
          treffer: [
            { titel: 'Graz nach Berlin, 13:40 Uhr', detail: '119 Euro, direkt' },
            { titel: 'Graz nach Berlin, 17:55 Uhr', detail: '134 Euro, direkt' },
            { titel: 'Graz nach Berlin, 09:15 Uhr', detail: '152 Euro, direkt' },
          ],
        },
      },
      {
        id: 'pruefen',
        text: 'Jetzt passt alles: Der Flug geht am Freitag, ist direkt und günstig.',
        kurz: true,
      },
    ],
  },
  ergebnis: 'Am Freitag startet der günstigste Direktflug um 13:40 Uhr für 119 Euro.',
}
