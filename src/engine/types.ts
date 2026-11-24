export type StationId =
  | 'eingabe' | 'wahrnehmung' | 'denken' | 'planung'
  | 'werkzeug' | 'handeln' | 'pruefen' | 'ergebnis'
export type Art = 'suche' | 'api' | 'code' | 'bild' | 'planung'
export type Format = 'hoch' | 'quadrat' | 'quer'
export type Tempo = 0.75 | 1 | 1.5

export interface Karte { icon: string; label: string }

export interface Werkzeugwahl {
  frage: string
  karten: [Karte, Karte, Karte]
  richtig: 0 | 1 | 2
  erklaerung: string
}

export interface StationScript {
  id: StationId
  text: string
  tiefer?: string[]
  kurz?: boolean
  gedaechtnis?: string
  werkzeug?: Werkzeugwahl
  daten?: Record<string, unknown>
}

/** Zweiter Durchlauf: denken … pruefen */
export interface Schleife { grund: string; zweiterDurchlauf: StationScript[] }

export interface Scenario {
  id: string
  titel: string
  aufgabe: string
  art: Art
  stichwoerter: string[]
  stationen: StationScript[]
  schleife?: Schleife
  ergebnis: string
}
