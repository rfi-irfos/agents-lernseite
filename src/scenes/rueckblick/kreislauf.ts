import { gsap } from 'gsap'
import { de } from '../../content/de'
import { el } from '../common'
import type { StationId } from '../../engine/types'
import type { PartCtx, PartHandle } from './types'

export const KREIS: StationId[] = ['eingabe', 'wahrnehmung', 'denken', 'planung', 'werkzeug', 'handeln', 'pruefen', 'ergebnis']
const R = 33 // Radius des Rings in Prozent der Kreisfläche
const R_MEM = 46

const pos = (deg: number, r: number) => ({
  left: `${50 + r * Math.cos((deg * Math.PI) / 180)}%`,
  top: `${50 + r * Math.sin((deg * Math.PI) / 180)}%`,
})
const stationDeg = (i: number) => -90 + i * 45

/** Der Kreislauf: acht Stationen im Kreis, Gedächtnis als Seitenarm von Denken, die Kugel umrundet ihn zweimal. */
export function kreislauf(c: PartCtx): PartHandle {
  const t = de.rueckblick.kreislauf
  const kreis = el('div', 'rb-kreis')
  kreis.setAttribute('role', 'group')
  kreis.setAttribute('aria-label', t.label)
  const denkenDeg = stationDeg(KREIS.indexOf('denken'))
  const m = pos(denkenDeg, R_MEM)
  const d0 = pos(denkenDeg, R)
  kreis.insertAdjacentHTML(
    'beforeend',
    `<svg class="rb-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="${R}"/>
      <line x1="${parseFloat(d0.left)}" y1="${parseFloat(d0.top)}" x2="${parseFloat(m.left)}" y2="${parseFloat(m.top)}"/>
    </svg>`,
  )
  const mitte = el('div', 'rb-mitte')
  mitte.setAttribute('aria-hidden', 'true')
  kreis.append(mitte)

  const satz = el('p', 'rb-satz')
  satz.textContent = t.intro
  const nodes: HTMLButtonElement[] = []
  const select = (b: HTMLButtonElement, name: string, sentence: string) => {
    nodes.forEach((n) => n.setAttribute('aria-pressed', String(n === b)))
    mitte.textContent = name
    satz.textContent = sentence
  }

  KREIS.forEach((id, i) => {
    const b = el('button', 'rb-node')
    b.type = 'button'
    b.dataset.station = id
    b.style.setProperty('--cc', `var(--c-${id})`)
    Object.assign(b.style, pos(stationDeg(i), R))
    b.setAttribute('aria-pressed', 'false')
    b.setAttribute('aria-label', de.stationNamen[id])
    b.innerHTML = `<span aria-hidden="true">${i + 1}</span>`
    b.addEventListener('click', () => select(b, de.stationNamen[id], t.stationen[id]))
    nodes.push(b)
    kreis.append(b)
  })
  const mem = el('button', 'rb-node rb-mem')
  mem.type = 'button'
  mem.dataset.station = 'gedaechtnis'
  mem.style.setProperty('--cc', 'var(--c-gedaechtnis)')
  Object.assign(mem.style, m)
  mem.setAttribute('aria-pressed', 'false')
  mem.setAttribute('aria-label', t.gedaechtnis)
  mem.innerHTML = '<span aria-hidden="true">+</span>'
  mem.addEventListener('click', () => select(mem, t.gedaechtnis, t.gedaechtnisText))
  nodes.push(mem)
  kreis.append(mem)

  const orb = el('div', 'rb-orb')
  orb.setAttribute('aria-hidden', 'true')
  kreis.append(orb)
  c.stage.append(kreis)
  c.text.append(satz)
  if (c.weiter) {
    const w = el('button', 'glass rb-weiter')
    w.type = 'button'
    w.dataset.action = 'rb-weiter'
    w.textContent = de.rueckblick.weiter
    w.addEventListener('click', () => c.weiter?.())
    c.text.append(w)
  }

  const lit = (i: number) => {
    nodes.forEach((n, k) => (k < KREIS.length ? n.toggleAttribute('data-lit', k === i) : undefined))
  }
  const place = (deg: number) => {
    Object.assign(orb.style, pos(-90 + deg, R))
    kreis.dataset.angle = String(Math.round(deg))
  }

  const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' } })
  if (c.reduced) {
    // keine Bewegung: pro Station ein Überblenden der Hervorhebung
    gsap.set(orb, { opacity: 0 })
    KREIS.forEach((_, i) => tl.call(() => lit(i), undefined, i * c.d(0.35)))
    tl.call(() => lit(-1), undefined, KREIS.length * c.d(0.35))
    tl.call(() => (kreis.dataset.angle = '720'))
  } else {
    const o = { deg: 0 }
    place(0)
    gsap.set(orb, { opacity: 0 })
    tl.to(orb, { opacity: 1, duration: c.d(0.3) })
    tl.to(o, {
      deg: 720,
      duration: c.d(7),
      onUpdate: () => {
        place(o.deg)
        lit(Math.round(o.deg / 45) % KREIS.length)
      },
    })
    tl.call(() => place(720))
    tl.call(() => lit(-1))
    tl.to(orb, { opacity: 0, duration: c.d(0.3) })
  }

  return { kill: () => tl.kill(), focus: () => nodes[0].focus({ preventScroll: true }) }
}
