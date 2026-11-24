import { registerSW } from 'virtual:pwa-register'

/**
 * Registriert den Service Worker (Offline-Betrieb). Ein neuer Stand übernimmt sofort die Zwischenspeicher
 * (autoUpdate), die Seite lädt aber nie mitten im Ablauf neu: Sie wartet, bis der Tab in den Hintergrund
 * geht oder die Seite ohnehin neu geöffnet wird. Erst dann läuft der neue Stand.
 */
export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return
  registerSW({
    immediate: true,
    onNeedReload() {
      const reload = () => {
        if (document.visibilityState === 'hidden') location.reload()
      }
      document.addEventListener('visibilitychange', reload)
    },
  })
}
