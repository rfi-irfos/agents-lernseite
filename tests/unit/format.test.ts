import { describe, it, expect } from 'vitest'
import { formatFor } from '../../src/engine/format'

describe('formatFor', () => {
  it('hoch', () => {
    expect(formatFor(360, 740)).toBe('hoch')
    expect(formatFor(799, 1000)).toBe('hoch')
  })
  it('quadrat', () => {
    expect(formatFor(800, 1000)).toBe('quadrat')
    expect(formatFor(1000, 800)).toBe('quadrat')
    expect(formatFor(1250, 1000)).toBe('quadrat')
  })
  it('quer', () => expect(formatFor(1366, 768)).toBe('quer'))
})
