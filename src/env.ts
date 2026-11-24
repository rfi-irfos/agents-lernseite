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

/**
 * Nur im Testmodus: `audio-new` je erzeugtem Audio-Objekt (src), `audio` je hörbarer Wiedergabe (nicht stumm,
 * Lautstärke > 0). So prüfen Tests „kein Objekt ohne Schalter“ und „welcher Effekt klingt“.
 */
export function spyAudio(): void {
  if (!isTest() || typeof window === 'undefined' || typeof window.Audio !== 'function') return
  const Native = window.Audio
  window.Audio = function (this: unknown, src?: string) {
    pushEvent({ type: 'audio-new', src: String(src ?? '') })
    const a = new Native(src)
    const play = a.play.bind(a)
    a.play = () => {
      if (!a.muted && a.volume > 0) pushEvent({ type: 'audio', src: String(src ?? '') })
      return play()
    }
    return a
  } as unknown as typeof Audio
}
