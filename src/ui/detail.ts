import { gsap } from 'gsap'
import { de } from '../content/de'
import { dur } from '../env'
import type { SceneCtx } from '../scenes/types'
import type { StationScript } from '../engine/types'
import { ICONS } from './controls'

const SCALE = 0.65 // die Bühne schrumpft auf höchstens 0,7
const EASE = 'power2.inOut'
const SECONDS = 0.45

interface Open {
  promise: Promise<void>
  close: () => Promise<void>
}
let cur: Open | null = null

export function isDetailOpen(): boolean {
  return cur !== null
}

/** Weicher Übergang; ohne Dauer (Testmodus) sofort gesetzt. */
function go(target: gsap.TweenTarget, vars: gsap.TweenVars, seconds: number): Promise<void> {
  return new Promise((res) => {
    if (seconds <= 0) {
      gsap.set(target, vars)
      res()
      return
    }
    gsap.to(target, { ...vars, duration: seconds, ease: EASE, overwrite: 'auto', onComplete: () => res() })
  })
}

/**
 * Detail-Ebene („Tiefer graben“): zeigt die `tiefer`-Sätze der Station. Die Bühne schrumpft (bei reduzierter Bewegung
 * blendet sie nur ab, ohne Skalierung) und bleibt sichtbar, die Seite scrollt nie, die Ebene darf innen scrollen.
 * Esc, ein Klick daneben oder „Schließen“ beenden sie. Der Fokus bleibt gefangen und kehrt zum Auslöser zurück.
 * Das Versprechen löst sich, sobald die Ebene vollständig geschlossen ist.
 */
export function openDetail(station: StationScript, ctx: SceneCtx): Promise<void> {
  if (cur) return cur.promise
  const { buehne } = ctx.slots
  const app = buehne.closest<HTMLElement>('#app')
  if (!app) return Promise.resolve()
  const steuerung = app.querySelector<HTMLElement>('[data-slot=steuerung]')
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const reduced = ctx.reduced
  const sec = dur(reduced ? 0.2 : SECONDS)

  const layer = document.createElement('div')
  layer.className = 'detail-layer'
  const panel = document.createElement('section')
  panel.className = 'detail'
  panel.tabIndex = 0
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.style.setProperty('--c', `var(--c-${station.id})`)
  const head = document.createElement('div')
  head.className = 'detail-head'
  const h2 = document.createElement('h2')
  h2.id = 'detail-titel'
  h2.textContent = `${de.steuerung.tiefer}: ${de.stationNamen[station.id]}`
  panel.setAttribute('aria-labelledby', h2.id)
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'glass ctl'
  closeBtn.dataset.action = 'close'
  closeBtn.title = de.detail.schliessen
  closeBtn.setAttribute('aria-label', de.detail.schliessen)
  closeBtn.innerHTML = ICONS.close
  head.append(h2, closeBtn)
  panel.append(head)
  for (const satz of station.tiefer ?? []) {
    const p = document.createElement('p')
    p.textContent = satz
    panel.append(p)
  }
  layer.append(panel)
  app.append(layer)

  /** Platz der Ebene: dort, wo die geschrumpfte Bühne nicht mehr ist (Maße aus dem Layout, nicht aus der Skalierung). */
  const place = () => {
    const quer = app.dataset.format === 'quer'
    const edge = quer ? buehne.offsetLeft + buehne.offsetWidth * SCALE : buehne.offsetTop + buehne.offsetHeight * SCALE
    layer.style.setProperty('--dl-edge', `${edge}px`)
    layer.style.setProperty('--dl-bottom', `${steuerung ? app.clientHeight - steuerung.offsetTop : 0}px`)
  }
  place()
  window.addEventListener('resize', place)

  // Alles dahinter ruht: kein Fokus, kein Klick (die Ebene selbst bleibt bedienbar).
  const behind = Array.from(app.querySelectorAll<HTMLElement>(':scope > [data-slot]'))
  behind.forEach((e) => (e.inert = true))

  let resolveClosed!: () => void
  const promise = new Promise<void>((r) => (resolveClosed = r))
  let closing: Promise<void> | null = null

  const close = (): Promise<void> => {
    if (closing) return closing
    closing = (async () => {
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', place)
      await Promise.all([
        go(panel, { opacity: 0, y: reduced ? 0 : 24 }, sec),
        reduced ? go(buehne, { opacity: 1 }, sec) : go(buehne, { scale: 1 }, sec),
      ])
      layer.remove()
      gsap.set(buehne, { clearProps: 'transform,transformOrigin,opacity' })
      behind.forEach((e) => (e.inert = false))
      cur = null
      const back = opener?.isConnected ? opener : app.querySelector<HTMLElement>('[data-action=tiefer]')
      back?.focus({ preventScroll: true })
      resolveClosed()
    })()
    return closing
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      void close()
    } else if (e.key === 'Tab') {
      const order = [panel, closeBtn]
      const i = order.indexOf(document.activeElement as HTMLElement)
      const nextI = i === -1 ? 0 : (i + (e.shiftKey ? order.length - 1 : 1)) % order.length
      e.preventDefault()
      order[nextI].focus({ preventScroll: true })
    }
  }
  document.addEventListener('keydown', onKey, true)
  layer.addEventListener('click', (e) => {
    if (e.target === layer) void close()
  })
  closeBtn.addEventListener('click', () => void close())

  cur = { promise, close }
  gsap.set(panel, { opacity: 0, y: reduced ? 0 : 24 })
  void go(panel, { opacity: 1, y: 0 }, sec)
  if (reduced) void go(buehne, { opacity: 0.45 }, sec)
  else void go(buehne, { scale: SCALE, transformOrigin: app.dataset.format === 'quer' ? '0% 50%' : '50% 0%' }, sec)
  panel.focus({ preventScroll: true })
  return promise
}

export function closeDetail(): Promise<void> {
  return cur ? cur.close() : Promise.resolve()
}
