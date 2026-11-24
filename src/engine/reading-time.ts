import type { Tempo } from './types'

/** Lesezeit in ms: höchstens 3 Wörter pro Sekunde, aufgerundet. */
export function readingMs(text: string, tempo: Tempo = 1): number {
  const words = text.split(/\s+/).filter(Boolean).length
  if (words === 0) return 0
  return Math.ceil(((words / 3) * 1000) / tempo)
}
