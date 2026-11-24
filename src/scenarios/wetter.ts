import type { Scenario } from '../engine/types'

export const wetter: Scenario = {
  id: 'wetter',
  titel: 'Wetter',
  aufgabe: 'Brauche ich morgen in Graz einen Schirm?',
  art: 'api',
  stichwoerter: ['wetter', 'regen', 'schirm', 'sonne', 'temperatur', 'morgen', 'kalt', 'warm'],
  stationen: [
    {
      id: 'eingabe',
      text: 'Du fragst, ob du morgen in Graz einen Schirm brauchst.',
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
        'Das Wetter von morgen kann nur ein Wetterdienst wissen.',
        'Er sucht deshalb einen Weg, wie er es herausfinden kann.',
        'Dahinter steckt ein Sprachmodell, das ist ein Computerprogramm, das aus sehr vielen Texten gelernt hat.',
      ],
    },
    {
      id: 'planung',
      text: 'Sein Plan: den Wetterdienst fragen und dann die Antwort ansehen.',
      kurz: true,
    },
    {
      id: 'werkzeug',
      text: 'Dafür greift er zu dem Werkzeug, das Wetter kennt.',
      tiefer: [
        'Ein Agent hat einen ganzen Werkzeugkasten, wie ein Handwerker.',
        'Er sucht sich das Werkzeug aus, das zur Aufgabe passt.',
      ],
      werkzeug: {
        frage: 'Welches Werkzeug hilft dem Agenten beim Wetter von morgen?',
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
        antwort: 'Morgen regnet es mit 80 % Wahrscheinlichkeit.',
      },
    },
    {
      id: 'pruefen',
      text: 'Er prüft: Die Antwort passt zu deiner Frage, also kann er sie weitergeben.',
      kurz: true,
    },
    {
      id: 'ergebnis',
      text: 'Und schon hast du deine Antwort: Nimm morgen einen Schirm mit.',
    },
  ],
  ergebnis: 'Ja, nimm morgen einen Schirm mit. In Graz regnet es mit 80 % Wahrscheinlichkeit.',
}
