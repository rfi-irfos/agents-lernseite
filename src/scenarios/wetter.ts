import type { Scenario } from '../engine/types'

export const wetter: Scenario = {
  id: 'wetter',
  titel: 'Wetter',
  kurzname: 'Wetter',
  aufgabe: 'Brauche ich morgen in Graz einen Schirm?',
  art: 'api',
  stichwoerter: ['wetter', 'regen', 'schirm', 'sonne', 'temperatur', 'gewitter', 'schnee', 'wolken'],
  stationen: [
    {
      id: 'eingabe',
      text: 'Du schickst deine Frage ab, und der Agent bekommt sie.',
    },
    {
      id: 'wahrnehmung',
      text: 'Der Agent liest deine Frage und merkt sich die wichtigen Wörter: morgen, Graz, Schirm.',
      tiefer: [
        'Der Agent zerlegt deinen Satz in einzelne Wörter, so wie du beim Lesen.',
        'Wörter wie „morgen“ und „Graz“ sagen ihm, wann und wo es um das Wetter geht.',
      ],
    },
    {
      id: 'denken',
      text: 'Er überlegt: Für das Wetter von morgen frage ich lieber nach.',
      tiefer: [
        'Vorhersagen kommen von Messgeräten und Wolkenbildern, die ein Wetterdienst auswertet.',
        'Darum fragt der Agent dort nach und verlässt sich auf die Messwerte.',
        'Dahinter steckt ein Sprachmodell, das ist ein Computerprogramm, das aus sehr vielen Texten gelernt hat.',
      ],
    },
    {
      id: 'planung',
      text: 'Sein Plan: den Wetterdienst fragen und dann die Antwort ansehen.',
      kurz: true,
      daten: { schritte: ['Wetterdienst fragen', 'Antwort ansehen'] },
    },
    {
      id: 'werkzeug',
      text: 'Dafür greift er zu dem Werkzeug, das Wetter kennt.',
      tiefer: [
        'Ein Agent hat einen ganzen Werkzeugkasten, wie ein Handwerker.',
        'Er sucht sich das Werkzeug aus, das zur Aufgabe passt.',
      ],
      werkzeug: {
        frage: 'Welches Werkzeug sagt dem Agenten, wie es morgen wird?',
        karten: [
          { icon: 'wetter', label: 'Wetterdienst' },
          { icon: 'rechner', label: 'Taschenrechner' },
          { icon: 'album', label: 'Fotoalbum' },
        ],
        richtig: 0,
        erklaerung:
          'Der Wetterdienst weiß, wie das Wetter morgen wird. Ein Taschenrechner rechnet Zahlen aus, und im Fotoalbum liegen alte Bilder.',
      },
    },
    {
      id: 'handeln',
      text: 'Er fragt beim Wetterdienst nach Graz und morgen, und die Antwort kommt sofort.',
      tiefer: [
        'Der Agent schickt seine Frage an einen anderen Computer, den Wetterdienst.',
        'Dieser Weg heißt API, das ist eine Tür, durch die Programme miteinander sprechen.',
      ],
      daten: {
        anfrage: 'Wetterdienst, wie wird das Wetter morgen in Graz?',
        antwort: 'Für Graz sagt der Wetterdienst morgen 80 % Regenwahrscheinlichkeit voraus.',
      },
    },
    {
      id: 'pruefen',
      text: 'Er prüft: Die Antwort passt zu deiner Frage, also kann er sie weitergeben.',
      kurz: true,
    },
    {
      id: 'ergebnis',
      text: 'Und schon hast du deine Antwort, die wie in einem Chat erscheint.',
    },
  ],
  ergebnis: 'Ja, nimm morgen einen Schirm mit, denn in Graz regnet es sehr wahrscheinlich.',
}
