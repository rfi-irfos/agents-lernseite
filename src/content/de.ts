export const de = {
  title: 'So arbeitet ein KI-Agent',
  theme: {
    toggle: 'Thema wechseln',
  },
  start: {
    heading: 'Deine Aufgabe',
    inputLabel: 'Deine Aufgabe',
    placeholder: 'Schreib deine eigene Aufgabe …',
    cardsLabel: 'Beispiel-Aufgaben',
    start: 'Ablauf starten',
    note: 'Im Hintergrund läuft kein echtes KI-Modell.',
    beispielHinweis: 'Das ist ein Beispiel. So ähnlich würde ein Agent deine Frage bearbeiten.',
    karten: [
      { id: 'flugsuche', titel: 'Flug suchen', aufgabe: 'Finde mir den günstigsten Flug von Graz nach Berlin am Freitag.' },
      { id: 'wetter', titel: 'Wetter', aufgabe: 'Brauche ich morgen in Graz einen Schirm?' },
      { id: 'programm', titel: 'Kleines Programm', aufgabe: 'Schreib mir ein Programm, das meine Einkaufsliste sortiert.' },
      { id: 'foto', titel: 'Foto-Frage', aufgabe: 'Was für eine Pflanze ist das?' },
      { id: 'ausflug', titel: 'Ausflug planen', aufgabe: 'Plan einen Schulausflug nach Wien für 25 Kinder.' },
    ],
  },
} as const
