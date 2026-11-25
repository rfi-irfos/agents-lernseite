import { gsap } from 'gsap'
import { de } from '../content/de'
import { dur } from '../env'
import type { SceneCtx } from './types'

export const EASE = 'power2.inOut'

/** Dauer in Sekunden: im Testmodus 0, bei reduzierter Bewegung höchstens 0,2 s. */
export function d(ctx: SceneCtx, seconds: number): number {
  return dur(ctx.reduced ? Math.min(seconds, 0.2) : seconds)
}

const MOVING = ['x', 'y', 'xPercent', 'yPercent', 'rotation', 'scale', 'scaleX', 'scaleY', 'strokeDashoffset', 'stagger', 'yoyo', 'repeat']

/**
 * Bewegungsarm: bei reduzierter Bewegung bleiben nur Überblendungen (Deckkraft, Farbe).
 * Alle Szenen schicken ihre Animationswerte hierdurch.
 */
export function tv<T extends gsap.TweenVars>(ctx: SceneCtx, vars: T): T {
  if (!ctx.reduced) return vars
  const out: Record<string, unknown> = { ...vars }
  for (const k of MOVING) delete out[k]
  return out as T
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

/** Hell/farbig getrennte Zeichnung, siehe scenes.css (.g-base, .g-acc, .g-acc-fill). */
export function svgBox(raw: string, cls: string): HTMLElement {
  const box = el('div', cls)
  box.innerHTML = raw
  return box
}

export function normWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/** Wörter der Eingabe, die der Erzählsatz der Station aufgreift (sie leuchten). */
export function wichtigeWoerter(karten: string[], erzaehl: string): Set<number> {
  const hay = normWord(erzaehl)
  const out = new Set<number>()
  karten.forEach((k, i) => {
    const n = normWord(k)
    if (n.length >= 4 && hay.includes(n)) out.add(i)
  })
  return out
}

/**
 * Text zuerst: der Erzählsatz blendet ein, danach beginnt die Handlung.
 * Gibt die Zeitleiste zurück, die Handlung hängt man hinter das Label `handlung`.
 */
export function startScene(ctx: SceneCtx): { tl: gsap.core.Timeline; stage: HTMLElement; satz: HTMLElement } {
  const { buehne, text } = ctx.slots
  const stage = el('div', 'stage')
  buehne.append(stage)
  const satz = el('p', 'erzaehl')
  satz.textContent = ctx.step.script.text
  text.querySelectorAll('.erzaehl').forEach((n) => n.remove())
  text.prepend(satz)
  const tl = gsap.timeline({ defaults: { ease: EASE } })
  tl.fromTo(satz, tv(ctx, { opacity: 0, y: 8 }), tv(ctx, { opacity: 1, y: 0, duration: d(ctx, 0.4), clearProps: 'y' }))
  tl.call(() => ctx.textReady?.())
  tl.addLabel('handlung')
  return { tl, stage, satz }
}

const NS = 'http://www.w3.org/2000/svg'

/**
 * Kurze Stationen: ein Ring in der Stationsfarbe zeichnet sich, der Name steht in der Mitte,
 * und die Daten-Kugel läuft einmal um den Ring.
 */
export function orbHop(ctx: SceneCtx, stage: HTMLElement, tl: gsap.core.Timeline): void {
  const wrap = el('div', 'emblem')
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 200 200')
  svg.setAttribute('aria-hidden', 'true')
  const spur = document.createElementNS(NS, 'circle')
  const ring = document.createElementNS(NS, 'circle')
  for (const [c, cls] of [[spur, 'emblem-spur'], [ring, 'emblem-ring']] as const) {
    c.setAttribute('cx', '100')
    c.setAttribute('cy', '100')
    c.setAttribute('r', '88')
    c.setAttribute('class', cls)
    svg.append(c)
  }
  const name = el('span', 'emblem-name')
  name.textContent = de.stationNamen[ctx.step.station]
  const bahn = el('div', 'emblem-bahn')
  const orb = el('div', 'orb orb-hop')
  orb.setAttribute('aria-hidden', 'true')
  bahn.append(orb)
  wrap.append(svg, name, bahn)
  stage.append(wrap)

  const len = 2 * Math.PI * 88
  if (ctx.reduced) {
    gsap.set([ring, name, orb], { opacity: 0 })
    tl.to([ring, name], { opacity: 1, duration: d(ctx, 0.2) }, 'handlung')
    tl.to(orb, { opacity: 1, duration: d(ctx, 0.2) })
    return
  }
  gsap.set(ring, { strokeDasharray: len, strokeDashoffset: len })
  gsap.set(name, { opacity: 0 })
  gsap.set(orb, { opacity: 0 })
  tl.to(ring, { strokeDashoffset: 0, duration: d(ctx, 0.9) }, 'handlung')
  tl.fromTo(name, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: d(ctx, 0.5), clearProps: 'transform' }, `handlung+=${d(ctx, 0.3)}`)
  tl.to(orb, { opacity: 1, duration: d(ctx, 0.2) }, 'handlung')
  tl.fromTo(bahn, { rotation: 0 }, { rotation: 360, duration: d(ctx, 1.4), ease: 'power1.inOut', clearProps: 'transform' }, 'handlung')
}

/** Datenstrom vom Rand eines Elements zum Rand eines anderen, in CSS-Pixeln der Bühne (#app). */
export function streamBetween(ctx: SceneCtx, a: Element, b: Element, ms: number): void {
  const root = ctx.slots.buehne.closest('#app') as HTMLElement | null
  if (!root || ctx.reduced) return
  const r = root.getBoundingClientRect()
  const ra = a.getBoundingClientRect()
  const rb = b.getBoundingClientRect()
  const pt = (q: DOMRect) => ({ x: q.left + q.width / 2 - r.left, y: q.top + q.height / 2 - r.top }) as DOMPoint
  void ctx.field.stream(pt(ra), pt(rb), ms)
}
