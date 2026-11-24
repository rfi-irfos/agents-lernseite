import { safeStore } from '../engine/store'

export type Theme = 'light' | 'dark'

export function initialTheme(): Theme {
  const saved = safeStore.get('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Hintergrundfarben je Thema, identisch mit `--bg` in tokens.css. */
export const THEME_COLOR: Record<Theme, string> = { light: '#f4f6fa', dark: '#070c19' }

type MetaLike = { setAttribute(n: string, v: string): void; removeAttribute(n: string): void }

/**
 * Setzt die Browserleisten-Farbe passend zum gewählten Thema. Die Metas im HTML folgen nur der Systemeinstellung
 * (media); nach der Wahl gilt die Farbe des Themas, deshalb verlieren sie ihr media-Attribut.
 */
export function syncThemeColor(metas: Iterable<MetaLike>, t: Theme): void {
  for (const m of metas) {
    m.setAttribute('content', THEME_COLOR[t])
    m.removeAttribute('media')
  }
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  syncThemeColor(document.querySelectorAll('meta[name=theme-color]'), t)
}

const FADE_CLEANUP_MS = 400 // etwas länger als --theme-fade (300 ms)
let fadeTimer: ReturnType<typeof setTimeout> | undefined

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  const root = document.documentElement
  root.classList.add('theme-fade')
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => root.classList.remove('theme-fade'), FADE_CLEANUP_MS)
  applyTheme(next)
  safeStore.set('theme', next)
  return next
}
