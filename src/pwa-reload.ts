export interface ReloadDeps {
  hidden: () => boolean
  phase: () => string | undefined
  /** Meldet Änderungen der Phase; gibt eine Abmelde-Funktion zurück. */
  watchPhase: (cb: () => void) => () => void
  /** Meldet Wechsel der Sichtbarkeit des Tabs. */
  watchVisibility: (cb: () => void) => () => void
  reload: () => void
}

/**
 * Lädt für einen neuen Stand nur neu, wenn der Tab im Hintergrund ist UND der Ablauf nicht läuft (Startbild).
 * Sonst wartet er, bis beides zutrifft. Mehrfaches Aufrufen legt nie zweite Wächter an.
 */
export function createReloadGuard(deps: ReloadDeps): () => void {
  let armed = false
  return () => {
    if (armed) return
    armed = true
    const offs: Array<() => void> = []
    const check = () => {
      if (!deps.hidden() || deps.phase() !== 'start') return
      offs.forEach((o) => o())
      deps.reload()
    }
    offs.push(deps.watchVisibility(check), deps.watchPhase(check))
  }
}

export function browserReloadGuard(): () => void {
  return createReloadGuard({
    hidden: () => document.visibilityState === 'hidden',
    phase: () => document.getElementById('app')?.dataset.phase,
    watchPhase: (cb) => {
      const app = document.getElementById('app')
      if (!app) return () => {}
      const mo = new MutationObserver(cb)
      mo.observe(app, { attributes: true, attributeFilter: ['data-phase'] })
      return () => mo.disconnect()
    },
    watchVisibility: (cb) => {
      document.addEventListener('visibilitychange', cb)
      return () => document.removeEventListener('visibilitychange', cb)
    },
    reload: () => location.reload(),
  })
}
