/** Testmodus (?test=1): alle Dauern 0, Ereignisse in window.__events. */
export type AppEvent = { type: string; [k: string]: unknown }

declare global {
  interface Window {
    __events?: AppEvent[]
    /** Nur im Testmodus: der laufende Player. */
    __player?: import('./engine/player').Player
  }
}

export function isTest(): boolean {
  try {
    return new URLSearchParams(location.search).get('test') === '1'
  } catch {
    return false
  }
}

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Dauer in Sekunden; im Testmodus immer 0. */
export function dur(seconds: number): number {
  return isTest() ? 0 : seconds
}

export function pushEvent(e: AppEvent): void {
  if (!isTest()) return
  ;(window.__events ??= []).push(e)
}
