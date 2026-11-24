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

/** `?motion=1` lässt im Testmodus die echten Dauern laufen (für Bewegungs-Tests). */
function realMotion(): boolean {
  try {
    return new URLSearchParams(location.search).get('motion') === '1'
  } catch {
    return false
  }
}

/** Dauer in Sekunden; im Testmodus 0, außer mit `&motion=1`. */
export function dur(seconds: number): number {
  return isTest() && !realMotion() ? 0 : seconds
}

export function pushEvent(e: AppEvent): void {
  if (!isTest()) return
  ;(window.__events ??= []).push(e)
}

/** Nur im Testmodus: meldet jedes erzeugte Audio-Objekt als Ereignis `audio` (src), damit Tests „kein Ton ohne Schalter“ prüfen können. */
export function spyAudio(): void {
  if (!isTest() || typeof window === 'undefined' || typeof window.Audio !== 'function') return
  const Native = window.Audio
  window.Audio = function (this: unknown, src?: string) {
    pushEvent({ type: 'audio', src: String(src ?? '') })
    return new Native(src)
  } as unknown as typeof Audio
}
