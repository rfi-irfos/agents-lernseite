import { registerSW } from 'virtual:pwa-register'
import { browserReloadGuard } from './pwa-reload'

/**
 * Registriert den Service Worker (Offline-Betrieb). Ein neuer Stand übernimmt sofort die Zwischenspeicher
 * (autoUpdate), die Seite lädt aber nie mitten im Ablauf neu: Sie wartet, bis der Tab im Hintergrund ist
 * und die App wieder im Startbild steht (Sperrbildschirm mitten im Ablauf wirft das Kind nicht zurück).
 */
export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return
  const arm = browserReloadGuard()
  registerSW({ immediate: true, onNeedReload: arm })
}
