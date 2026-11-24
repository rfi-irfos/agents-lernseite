import type { Scenario } from '../engine/types'

export const programm: Scenario = {
  id: 'programm',
  titel: 'Kleines Programm',
  aufgabe: 'Schreib mir ein Programm, das meine Einkaufsliste sortiert.',
  art: 'code',
  stichwoerter: ['programm', 'code', 'einkaufsliste', 'skript', 'python', 'sortier', 'programmier'],
  stationen: [
    {
      id: 'eingabe',
      text: 'Du sendest deinen Wunsch ab, und der Agent beginnt zu lesen.',
    },
    {
      id: 'wahrnehmung',
      text: 'Er merkt sich die wichtigen Wörter: Programm, Einkaufsliste und sortieren.',
      tiefer: [
        'Ein Programm ist eine Liste von Anweisungen, die ein Computer Schritt für Schritt ausführt.',
        'Sortieren heißt, die Dinge in eine feste Reihenfolge zu bringen, zum Beispiel nach dem Alphabet.',
      ],
    },
    {
      id: 'denken',
      text: 'Er überlegt: Ich schreibe ein paar Zeilen, die die Wörter nach dem Alphabet ordnen.',
      tiefer: [
        'Ein Sprachmodell, also ein Computerprogramm, das aus sehr vielen Texten gelernt hat, kennt viele Programme.',
        'Daraus baut der Agent ein neues, das zu deiner Liste passt.',
      ],
    },
    {
      id: 'planung',
      text: 'Er teilt die Arbeit in drei kleine Schritte auf.',
      daten: { schritte: ['Programm schreiben', 'Test bauen', 'Alles ausprobieren'] },
    },
    {
      id: 'werkzeug',
      text: 'Er öffnet das Werkzeug, in dem sich Programme schreiben und ausprobieren lassen.',
      tiefer: [
        'Ein Agent hat einen ganzen Werkzeugkasten, und jedes Werkzeug hat seine eigene Aufgabe.',
        'Das Programmfenster ist ein Fenster, in das man Befehle tippt und sofort die Antwort sieht.',
      ],
      werkzeug: {
        frage: 'Wo kann der Agent sein Programm gleich ausprobieren?',
        karten: [
          { icon: 'album', label: 'Fotoalbum' },
          { icon: 'wetter', label: 'Wetterdienst' },
          { icon: 'terminal', label: 'Programmfenster' },
        ],
        richtig: 2,
        erklaerung:
          'Im Programmfenster läuft ein Programm sofort los. Das Fotoalbum zeigt Bilder, und der Wetterdienst kennt die Wolken.',
      },
    },
    {
      id: 'handeln',
      text: 'Er tippt das Programm Zeile für Zeile ins Fenster und startet danach den Test.',
      tiefer: [
        'Ein Test ist eine kleine Prüfung, die dem Programm eine Aufgabe stellt und die Antwort kontrolliert.',
        'Grün bedeutet, die Antwort stimmt, und rot zeigt einen Fehler.',
      ],
      daten: {
        zeilen: ['einkauf = ["Milch", "Brot", "Apfel"]', 'einkauf.sort(reverse=True)', 'print(einkauf)'],
        test: { name: 'Apfel steht vor Brot und Milch', ok: false },
      },
    },
    {
      id: 'pruefen',
      text: 'Er sieht sich den Test an: Die Liste steht rückwärts, Milch kommt vor Apfel.',
    },
    {
      id: 'ergebnis',
      text: 'Zum Schluss bekommst du das fertige Programm.',
    },
  ],
  schleife: {
    grund: 'Ein roter Test zeigt den Fehler, also geht der Agent zurück und bessert das Programm nach.',
    zweiterDurchlauf: [
      {
        id: 'denken',
        text: 'Er überlegt neu: Die zweite Zeile dreht die Reihenfolge um, das muss er ändern.',
        tiefer: [
          'Fehler zu finden und zu beheben gehört beim Programmieren dazu, auch bei Menschen.',
          'Der Agent liest die Meldung des Tests genau, wie ein Detektiv einen Hinweis.',
        ],
      },
      {
        id: 'planung',
        text: 'Er macht einen neuen Plan, der nur eine Zeile betrifft.',
        daten: { schritte: ['Zeile ändern', 'Test wiederholen'] },
      },
      {
        id: 'werkzeug',
        text: 'Er nutzt dasselbe Programmfenster und verbessert dort seine Zeilen.',
      },
      {
        id: 'handeln',
        text: 'Er ändert die Zeile und startet den Test, und diesmal leuchtet er grün.',
        daten: {
          zeilen: ['einkauf = ["Milch", "Brot", "Apfel"]', 'einkauf.sort()', 'print(einkauf)'],
          test: { name: 'Apfel steht vor Brot und Milch', ok: true },
        },
      },
      {
        id: 'pruefen',
        text: 'Jetzt stimmt alles, und das Programm erfüllt deine Aufgabe.',
        kurz: true,
      },
    ],
  },
  ergebnis: 'Hier ist dein Programm: Es sortiert die Einkaufsliste von Apfel bis Milch.',
}
