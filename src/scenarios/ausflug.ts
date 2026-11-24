import type { Scenario } from '../engine/types'

export const ausflug: Scenario = {
  id: 'ausflug',
  titel: 'Ausflug planen',
  aufgabe: 'Plan einen Schulausflug nach Wien für 25 Kinder.',
  art: 'planung',
  stichwoerter: ['ausflug', 'klassenfahrt', 'wandertag', 'exkursion', 'schulreise', 'kinder'],
  stationen: [
    {
      id: 'eingabe',
      text: 'Du bittest den Agenten, einen Schulausflug nach Wien für 25 Kinder zu planen.',
    },
    {
      id: 'wahrnehmung',
      text: 'Er merkt sich: Schulausflug, Wien und 25 Kinder, denn die Zahl bestimmt Preise und Platz.',
      tiefer: [
        'Zahlen wie die 25 sind für den Agenten genauso wichtig wie Wörter.',
        'Ein Ausflug für eine ganze Klasse braucht eine andere Planung als eine Reise zu zweit.',
      ],
    },
    {
      id: 'denken',
      text: 'Er überlegt: Ich brauche Zugzeiten, Ziele in Wien und einen Blick auf die Kosten.',
      gedaechtnis: 'Die Klassenkasse hat 500 Euro für Ausflüge.',
      tiefer: [
        'Das Gedächtnis des Agenten ist eine Schublade mit Notizen aus früheren Gesprächen.',
        'Er holt sich genau die Notizen heraus, die zur Aufgabe passen.',
      ],
    },
    {
      id: 'planung',
      text: 'Sein Plan: Zug suchen, Ziele auswählen, die Gesamtkosten ausrechnen und alles in Reihenfolge legen.',
      daten: { schritte: ['Zug suchen', 'Ziele auswählen', 'Kosten ausrechnen', 'Tag in Reihenfolge legen'] },
    },
    {
      id: 'werkzeug',
      text: 'Er braucht zwei Werkzeuge: einen Fahrplan für die Zeiten und einen Rechner für die Kosten.',
      tiefer: [
        'Bei einer großen Aufgabe benutzt ein Agent mehrere Werkzeuge nacheinander.',
        'Jedes Ergebnis wandert als Baustein in den Plan.',
      ],
      werkzeug: {
        frage: 'Womit findet der Agent heraus, wann der Zug nach Wien fährt?',
        karten: [
          { icon: 'album', label: 'Fotoalbum' },
          { icon: 'rechner', label: 'Taschenrechner' },
          { icon: 'fahrplan', label: 'Fahrplan' },
        ],
        richtig: 2,
        erklaerung:
          'Im Fahrplan stehen alle Abfahrtszeiten. Das Fotoalbum zeigt alte Bilder, und der Taschenrechner kennt nur Zahlen.',
      },
    },
    {
      id: 'handeln',
      text: 'Der Agent legt den Tag von früh bis zum Nachmittag als Route auf die Karte.',
      tiefer: [
        'Jeder Halt auf der Karte hat einen Ort und eine Uhrzeit.',
        'Zwischen den Zielen bleibt den Kindern Zeit zum Verschnaufen.',
      ],
      daten: {
        punkte: [
          { ort: 'Zug nach Wien', zeit: '08:00' },
          { ort: 'Tiergarten Schönbrunn', zeit: '10:00' },
          { ort: 'Mittagspause im Prater', zeit: '12:30' },
          { ort: 'Riesenrad', zeit: '14:00' },
          { ort: 'Zug nach Hause', zeit: '16:30' },
        ],
      },
    },
    {
      id: 'pruefen',
      text: 'Er rechnet nach: Alle Ziele zusammen kosten 825 Euro, die Klassenkasse hat aber 500 Euro.',
    },
    {
      id: 'ergebnis',
      text: 'Zum Schluss steht der ganze Tag als fertiger Plan für dich bereit.',
    },
  ],
  schleife: {
    grund: 'Das ist zu teuer, darum geht er zurück zum Denken und sucht günstigere Ziele.',
    zweiterDurchlauf: [
      {
        id: 'denken',
        text: 'Jetzt überlegt er neu: Ein Museum mit Gruppenpreis und ein Park mit freiem Eintritt sparen viel Geld.',
        tiefer: [
          'Die Klassenkasse bleibt der Maßstab, den der Agent aus seiner Notiz kennt.',
          'Wer sparen will, sucht Ziele mit ähnlichem Spaß und kleinerem Preis.',
        ],
      },
      {
        id: 'planung',
        text: 'Neuer Plan: Zug behalten, Tiergarten und Riesenrad streichen, Museum und Stadtpark einplanen.',
        daten: { schritte: ['Zug behalten', 'Tiergarten und Riesenrad streichen', 'Museum und Stadtpark einplanen'] },
      },
      {
        id: 'werkzeug',
        text: 'Wieder helfen ihm Fahrplan und Rechner, diesmal für die neuen Ziele.',
      },
      {
        id: 'handeln',
        text: 'Er legt die neue Route auf die Karte, und sie sieht schon günstiger aus.',
        daten: {
          punkte: [
            { ort: 'Zug nach Wien', zeit: '08:00' },
            { ort: 'Naturhistorisches Museum', zeit: '10:30' },
            { ort: 'Picknick im Stadtpark', zeit: '12:30' },
            { ort: 'Spaziergang über die Ringstraße', zeit: '14:00' },
            { ort: 'Zug nach Hause', zeit: '16:00' },
          ],
        },
      },
      {
        id: 'pruefen',
        text: 'Er rechnet erneut: Der Plan kostet 400 Euro und passt in die Klassenkasse.',
      },
    ],
  },
  ergebnis: 'Der Plan: Zug um 8:00, Museum, Picknick im Stadtpark und Rückfahrt um 16:00 für 400 Euro.',
}
