import { describe, it, expect } from 'vitest'
import { readingMs } from '../../src/engine/reading-time'

describe('readingMs', () => {
  it('3 Wörter = 1000 ms', () => expect(readingMs('eins zwei drei')).toBe(1000))
  it('Tempo 1.5 rundet auf', () => expect(readingMs('eins zwei drei', 1.5)).toBe(667))
  it('leer = 0', () => expect(readingMs('  ')).toBe(0))
})
