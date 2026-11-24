import type { Scenario, StationId, StationScript } from '../../src/engine/types'

const ORDER: StationId[] = [
  'eingabe', 'wahrnehmung', 'denken', 'planung', 'werkzeug', 'handeln', 'pruefen', 'ergebnis',
]

export function script(id: StationId, extra: Partial<StationScript> = {}): StationScript {
  return { id, text: `Text ${id} eins zwei drei vier fünf sechs`, ...extra }
}

export const frage = {
  frage: 'Welches Werkzeug?',
  karten: [
    { icon: 'a', label: 'A' },
    { icon: 'b', label: 'B' },
    { icon: 'c', label: 'C' },
  ] as [{ icon: string; label: string }, { icon: string; label: string }, { icon: string; label: string }],
  richtig: 1 as const,
  erklaerung: 'Darum B.',
}

export function scenario(withLoop = false): Scenario {
  return {
    id: 'fix',
    titel: 'Fixture',
    aufgabe: 'Aufgabe',
    art: 'suche',
    stichwoerter: ['x'],
    stationen: ORDER.map((id) => script(id, id === 'werkzeug' ? { werkzeug: frage } : {})),
    schleife: withLoop
      ? {
          grund: 'Nochmal',
          zweiterDurchlauf: (['denken', 'planung', 'werkzeug', 'handeln', 'pruefen'] as StationId[]).map(
            (id) => script(id),
          ),
        }
      : undefined,
    ergebnis: 'Ergebnis',
  }
}
