import { describe, it, expect } from 'vitest'
import { syncThemeColor, THEME_COLOR } from '../../src/theme/theme'

function meta(content: string, media: string) {
  const attrs: Record<string, string> = { content, media }
  return {
    attrs,
    setAttribute: (n: string, v: string) => void (attrs[n] = v),
    removeAttribute: (n: string) => void delete attrs[n],
  }
}

describe('theme-color folgt dem Thema', () => {
  it('beide Metas bekommen die Farbe des gewählten Themas und verlieren media', () => {
    const a = meta('#f4f6fa', '(prefers-color-scheme: light)')
    const b = meta('#070c19', '(prefers-color-scheme: dark)')
    syncThemeColor([a, b], 'dark')
    expect(a.attrs).toEqual({ content: '#070c19' })
    expect(b.attrs).toEqual({ content: '#070c19' })
    syncThemeColor([a, b], 'light')
    expect(a.attrs.content).toBe('#f4f6fa')
    expect(b.attrs.content).toBe('#f4f6fa')
  })
  it('Farben stimmen mit --bg der Themen überein', () => {
    expect(THEME_COLOR).toEqual({ light: '#f4f6fa', dark: '#070c19' })
  })
})
