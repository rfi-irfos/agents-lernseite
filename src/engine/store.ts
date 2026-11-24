const PREFIX = 'agents.'
const memory = new Map<string, string>()

export const safeStore = {
  get(k: string): string | null {
    try {
      const v = localStorage.getItem(PREFIX + k)
      if (v !== null) return v
    } catch {
      /* Speicher nicht verfügbar */
    }
    return memory.get(k) ?? null
  },
  set(k: string, v: string): void {
    memory.set(k, v)
    try {
      localStorage.setItem(PREFIX + k, v)
    } catch {
      /* Speicher nicht verfügbar, Arbeitsspeicher genügt */
    }
  },
}

export function seenScenarios(): string[] {
  try {
    const v: unknown = JSON.parse(safeStore.get('seen') ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function markSeen(id: string): void {
  const cur = seenScenarios()
  if (!cur.includes(id)) safeStore.set('seen', JSON.stringify([...cur, id]))
}
