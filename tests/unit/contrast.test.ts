import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(`../../src/${p}`, import.meta.url), 'utf8')
const tokens = read('theme/tokens.css')
const rb = read('scenes/rueckblick/rueckblick.css')

/** Variablen eines Themas: Wurzelblock plus (für dunkel) der Dark-Block darüber gelegt. */
function vars(css: string, theme: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {}
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  for (const [, sel, body] of blocks) {
    const s = sel.trim()
    const hit = s.split(',').some((x) => {
      x = x.trim()
      return x === ':root' || (theme === 'dark' ? x === ":root[data-theme='dark']" : x === ":root[data-theme='light']")
    })
    if (!hit) continue
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2]
  }
  return out
}

function lum(h: string): number {
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [1, 3, 5].map((i) => f(parseInt(h.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('Kontrast der Stationsfarben (mindestens 3:1 für Grafik)', () => {
  for (const theme of ['light', 'dark'] as const) {
    const t = { ...vars(tokens, theme), ...vars(rb, theme) }
    const names = Object.keys(t).filter((k) => /^--(c|rb)-/.test(k))
    it(`${theme}: Karte und Hintergrund sind gesetzt, ${names.length} Farben geprüft`, () => {
      expect(t['--card']).toBeTruthy()
      expect(t['--bg']).toBeTruthy()
      expect(names.length).toBeGreaterThanOrEqual(12)
    })
    for (const n of names) {
      it(`${theme}: ${n} ≥ 3:1 gegen Karte und Hintergrund`, () => {
        expect(ratio(t[n], t['--card'])).toBeGreaterThanOrEqual(3)
        expect(ratio(t[n], t['--bg'])).toBeGreaterThanOrEqual(3)
      })
    }
  }
  it('dunkel überschreibt jede Stationsfarbe ausdrücklich', () => {
    const light = Object.keys(vars(tokens, 'light')).filter((k) => k.startsWith('--c-'))
    const dark = tokens.slice(tokens.indexOf(":root[data-theme='dark']"))
    for (const k of light) expect(dark).toContain(`${k}:`)
  })
})
