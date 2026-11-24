import { describe, it, expect, vi, afterEach } from 'vitest'

async function fresh() {
  vi.resetModules()
  return await import('../../src/engine/store')
}

describe('store', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('localStorage wirft bei jedem Zugriff: Speicher im Arbeitsspeicher', async () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('x') },
      setItem() { throw new Error('x') },
    })
    const s = await fresh()
    expect(() => s.markSeen('wetter')).not.toThrow()
    expect(s.seenScenarios()).toEqual(['wetter'])
    s.markSeen('wetter')
    s.markSeen('foto')
    expect(s.seenScenarios()).toEqual(['wetter', 'foto'])
    s.safeStore.set('theme', 'dunkel')
    expect(s.safeStore.get('theme')).toBe('dunkel')
  })

  it('ohne localStorage-Objekt', async () => {
    const s = await fresh()
    s.safeStore.set('a', 'b')
    expect(s.safeStore.get('a')).toBe('b')
    expect(s.safeStore.get('fehlt')).toBeNull()
  })

  it('Schlüssel mit Präfix agents.', async () => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    })
    const s = await fresh()
    s.markSeen('wetter')
    expect([...data.keys()]).toEqual(['agents.seen'])
    expect(JSON.parse(data.get('agents.seen')!)).toEqual(['wetter'])
  })

  it('kaputtes JSON gilt als leer', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '{kaputt',
      setItem: () => {},
    })
    const s = await fresh()
    expect(s.seenScenarios()).toEqual([])
  })
})
