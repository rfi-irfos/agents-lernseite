import type { Scenario } from './types'

export function normalize(t: string): string {
  return t
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

/** Teilwort-Treffer zählen mit ihrer Länge, damit „ausflug“ in „Schulausflug“ vor „flug“ gewinnt. */
export function matchScenario(text: string, all: Scenario[]): { scenario: Scenario; beispiel: boolean } {
  const t = normalize(text)
  let best: Scenario | undefined
  let bestScore = 0
  for (const sc of all) {
    let score = 0
    for (const k of sc.stichwoerter) {
      const kw = normalize(k).trim()
      if (kw && t.includes(kw)) score += kw.length
    }
    if (score > bestScore) {
      best = sc
      bestScore = score
    }
  }
  if (best) return { scenario: best, beispiel: false }
  return { scenario: all.find((x) => x.id === 'wetter') ?? all[0], beispiel: true }
}

export function wordCards(text: string, max = 8): string[] {
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/^\p{P}+|\p{P}+$/gu, ''))
    .filter(Boolean)
  return words.length > max ? [...words.slice(0, max), '…'] : words
}
