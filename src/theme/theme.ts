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

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.classList.add('theme-fade')
  applyTheme(next)
  safeStore.set('theme', next)
  return next
}
