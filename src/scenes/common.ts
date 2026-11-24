import { gsap } from 'gsap'
import { dur } from '../env'
import type { SceneCtx } from './types'

export const EASE = 'power2.inOut'

/** Dauer in Sekunden: im Testmodus 0, bei reduzierter Bewegung höchstens 0,2 s. */
export function d(ctx: SceneCtx, seconds: number): number {
  return dur(ctx.reduced ? Math.min(seconds, 0.2) : seconds)
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
  tl.fromTo(satz, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: d(ctx, 0.4), clearProps: 'y' })
  tl.call(() => ctx.textReady?.())
  tl.addLabel('handlung')
  return { tl, stage, satz }
}

/** Kleiner Kugel-Hüpfer für kurze Stationen. */
export function orbHop(ctx: SceneCtx, stage: HTMLElement, tl: gsap.core.Timeline): void {
  const orb = el('div', 'orb orb-hop')
  orb.setAttribute('aria-hidden', 'true')
  stage.append(orb)
  tl.fromTo(orb, { opacity: 0, x: '-4em', y: 0 }, { opacity: 1, x: '0em', duration: d(ctx, 0.4) }, 'handlung')
  tl.to(orb, { y: '-1.2em', duration: d(ctx, 0.25), ease: 'power2.out' })
  tl.to(orb, { y: '0em', duration: d(ctx, 0.25), ease: 'power2.in' })
  tl.to(orb, { x: '4em', opacity: 0, duration: d(ctx, 0.4) })
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
