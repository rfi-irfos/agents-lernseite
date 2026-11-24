import { gsap } from 'gsap'
import { de } from '../content/de'
import { d, el, startScene, svgBox, tv } from './common'
import { svgRaw } from './svg'
import type { SceneBuilder } from './types'

/**
 * Haken: das Ergebnis wird mit der Aufgabe verglichen.
 * Gibt es eine Schleife und ist es der erste Durchlauf, fehlt etwas: der Grund steht da und die Kugel fliegt zurück zu Denken.
 * Im zweiten Durchlauf oder ohne Schleife passt es, der Haken wird gezeichnet.
 */
export const pruefen: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const schleife = ctx.scenario.schleife
  const zurueck = !!schleife && ctx.step.pass === 1

  const wrap = el('div', 'pruefen')
  const aufgabe = el('div', 'pruef-aufgabe')
  const text = el('span')
  text.textContent = ctx.scenario.aufgabe
  aufgabe.append(svgBox(svgRaw('lupe'), 'pruef-lupe'), text)

  const box = el('div', 'pruef-urteil')
  if (zurueck) {
    box.classList.add('luecke')
    box.setAttribute('role', 'img')
    box.setAttribute('aria-label', de.stationen.luecke)
    box.innerHTML =
      '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle class="g-base" cx="32" cy="32" r="26"/><path class="g-acc" d="M24 24a8 8 0 1 1 11 7c-3 1.5-3 4-3 6"/><circle class="g-acc-fill" cx="32" cy="47" r="3"/></svg>'
  } else {
    box.classList.add('haken')
    box.setAttribute('role', 'img')
    box.setAttribute('aria-label', de.stationen.passt)
    box.innerHTML = svgRaw('haken')
  }
  wrap.append(aufgabe, box)

  let orb: HTMLElement | null = null
  let ziel: HTMLElement | null = null
  if (zurueck && schleife) {
    const grund = el('p', 'schleifengrund')
    grund.textContent = schleife.grund
    ziel = el('div', 'ziel-denken')
    ziel.textContent = de.stationen.denken
    ziel.setAttribute('aria-label', de.stationen.zurueckZuDenken)
    orb = el('div', 'orb orb-rueck')
    orb.setAttribute('aria-hidden', 'true')
    wrap.append(ziel, grund)
    stage.append(wrap, orb)
    gsap.set(orb, { opacity: 0 })
    gsap.set(ziel, { opacity: 0.45 })
    gsap.set(grund, { opacity: 0 })
    tl.fromTo(box, tv(ctx, { opacity: 0, scale: 0.8 }), tv(ctx, { opacity: 1, scale: 1, duration: d(ctx, 0.4), clearProps: 'transform' }), 'handlung')
    tl.to(grund, { opacity: 1, duration: d(ctx, 0.4) })
    tl.to(ziel, { opacity: 1, duration: d(ctx, 0.3) }, '<')
    flight(ctx, tl, stage, orb, box, ziel)
    return tl
  }

  stage.append(wrap)
  const strich = box.querySelector<SVGElement>('.haken-strich')
  gsap.set(box, { opacity: 0 })
  tl.to(box, { opacity: 1, duration: d(ctx, 0.3) }, 'handlung')
  if (strich) {
    // Der Haken wird gezeichnet; bei reduzierter Bewegung bleibt nur die Überblendung.
    tl.fromTo(strich, tv(ctx, { strokeDashoffset: 1 }), tv(ctx, { strokeDashoffset: 0, duration: d(ctx, 0.5) }), '<')
  }
  return tl
}

/** Die Daten-Kugel fliegt vom Urteil zurück zu Denken, im Bogen. Bei reduzierter Bewegung nur Überblenden. */
function flight(ctx: Parameters<SceneBuilder>[0], tl: gsap.core.Timeline, stage: HTMLElement, orb: HTMLElement, von: HTMLElement, nach: HTMLElement): void {
  const p = { sx: 0, sy: 0, dx: 0, dy: 0 }
  tl.call(() => {
    const s = stage.getBoundingClientRect()
    const a = von.getBoundingClientRect()
    const b = nach.getBoundingClientRect()
    p.sx = a.left + a.width / 2 - s.left
    p.sy = a.top + a.height / 2 - s.top
    p.dx = b.left + b.width / 2 - (a.left + a.width / 2)
    p.dy = b.top + b.height / 2 - (a.top + a.height / 2)
    gsap.set(orb, { left: p.sx, top: p.sy })
  })
  if (ctx.reduced) {
    tl.to(orb, { opacity: 1, duration: d(ctx, 0.2) })
    tl.to(orb, { opacity: 0, duration: d(ctx, 0.2) })
    return
  }
  const T = d(ctx, 1.2)
  tl.to(orb, { opacity: 1, duration: d(ctx, 0.15) })
  tl.to(orb, { x: () => p.dx, duration: T, ease: 'power2.inOut' }, '>')
  tl.to(orb, { y: () => Math.min(p.dy, 0) - 48, duration: T / 2, ease: 'power2.out' }, '<')
  tl.to(orb, { y: () => p.dy, duration: T / 2, ease: 'power2.in' }, '>')
  tl.to(orb, { opacity: 0, duration: d(ctx, 0.2) })
}
