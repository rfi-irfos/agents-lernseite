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

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
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
