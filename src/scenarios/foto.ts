import type { Scenario } from '../engine/types'

export const foto: Scenario = {
  id: 'foto',
  titel: 'Foto-Frage',
  aufgabe: 'Was für eine Pflanze ist das?',
  art: 'bild',
  stichwoerter: ['foto', 'pflanze', 'blume', 'baum', 'blüte', 'fotografier', 'bild von'],
  stationen: [
    {
      id: 'eingabe',
      text: 'Du hängst ein Foto an deine Nachricht, und der Agent bekommt es.',
    },
    {
      id: 'wahrnehmung',
      text: 'Er liest deine Frage und sieht sich das Foto genau an.',
      tiefer: [
        'Ein Foto besteht aus unzähligen kleinen Punkten, und der Agent sucht darin nach Formen.',
        'Blätter und Stängel erkennt er an ihren Umrissen.',
      ],
    },
    {
      id: 'denken',
      text: 'Er überlegt: An Form und Farbe der Blätter lässt sich eine Pflanze am besten erkennen.',
      tiefer: [
        'Der Agent hat sehr viele Pflanzenbilder gesehen und erkennt Muster wieder.',
        'Dabei hilft ihm ein Sprachmodell, ein Computerprogramm, das aus vielen Texten und Bildern gelernt hat.',
      ],
    },
    {
      id: 'planung',
      text: 'Er ordnet seine Arbeit in drei Schritte.',
      daten: { schritte: ['Foto abtasten', 'Merkmale sammeln', 'Mit bekannten Pflanzen vergleichen'] },
    },
    {
      id: 'werkzeug',
      text: 'Dafür nimmt er das Werkzeug, das Bilder ansehen kann.',
      tiefer: [
        'Für jede Art von Aufgabe gibt es ein passendes Werkzeug im Kasten des Agenten.',
        'Die Bilderkennung ist für Bilder gebaut, so wie eine Säge für Holz.',
      ],
      werkzeug: {
        frage: 'Welches Werkzeug erkennt, was auf einem Foto zu sehen ist?',
        karten: [
          { icon: 'bild', label: 'Bilderkennung' },
          { icon: 'rechner', label: 'Taschenrechner' },
          { icon: 'wetter', label: 'Wetterdienst' },
        ],
        richtig: 0,
        erklaerung:
          'Die Bilderkennung sucht Formen und Farben im Foto. Der Taschenrechner kennt Zahlen, und der Wetterdienst kennt die Wolken.',
      },
    },
    {
      id: 'handeln',
      text: 'Eine Linie tastet das Foto ab, und die wichtigen Stellen leuchten auf.',
      tiefer: [
        'Die Linie ist nur ein Bild dafür: Der Agent schaut sich das ganze Foto auf einmal an.',
        'Jede leuchtende Stelle ist ein Merkmal, das ihm bei der Antwort hilft.',
      ],
      daten: {
        src: 'pflanze',
        markierungen: [
          { x: 32, y: 32, label: 'Blatt' },
          { x: 50, y: 60, label: 'Stängel' },
          { x: 50, y: 86, label: 'Topf' },
        ],
      },
    },
    {
      id: 'pruefen',
      text: 'Er prüft: Die Merkmale passen zu einer Zimmerpflanze, also kann er antworten.',
      kurz: true,
    },
    {
      id: 'ergebnis',
      text: 'Jetzt schreibt er dir, was er auf dem Foto entdeckt hat.',
    },
  ],
  ergebnis: 'Das sieht nach einem jungen Gummibaum aus. Mit einem Foto der ganzen Pflanze wüsste der Agent es genauer.',
}
