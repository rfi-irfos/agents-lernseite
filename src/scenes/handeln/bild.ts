import { gsap } from 'gsap'
import { de } from '../../content/de'
import { parseHandelnDaten } from '../../engine/handeln'
import { d, el, orbHop, startScene, tv } from '../common'
import { svgRaw } from '../svg'
import type { SceneBuilder } from '../types'

/** Foto: eine Linie tastet das Bild ab, dann erscheinen die Markierungen. */
export const bild: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const daten = parseHandelnDaten('bild', ctx.step.script.daten)
  if (!daten) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const rahmen = el('div', 'bildrahmen')
  rahmen.setAttribute('role', 'img')
  rahmen.setAttribute('aria-label', de.stationen.bild)
  const zeichnung = el('div', 'bild-zeichnung')
  zeichnung.innerHTML = svgRaw(daten.src)
  const linie = el('div', 'abtastlinie')
  linie.setAttribute('aria-hidden', 'true')
  rahmen.append(zeichnung, linie)
  const marken = daten.markierungen.map((m) => {
    const b = el('div', 'markierung')
    b.style.left = `${m.x}%`
    b.style.top = `${m.y}%`
    const ring = el('span', 'markierung-ring')
    const text = el('span', 'markierung-text')
    text.textContent = m.label
    b.append(ring, text)
    rahmen.append(b)
    return b
  })
  stage.append(rahmen)
  gsap.set(marken, { opacity: 0 })
  gsap.set(linie, { opacity: 0 })

  tl.to(linie, { opacity: 1, duration: d(ctx, 0.2) }, 'handlung')
  if (!ctx.reduced) {
    tl.fromTo(linie, { y: 0 }, { y: () => rahmen.clientHeight - linie.offsetHeight, duration: d(ctx, 1.4), ease: 'power1.inOut' })
  }
  tl.to(linie, { opacity: 0, duration: d(ctx, 0.3) })
  tl.fromTo(
    marken,
    tv(ctx, { opacity: 0, scale: 0.6 }),
    tv(ctx, { opacity: 1, scale: 1, duration: d(ctx, 0.4), stagger: d(ctx, 0.25), clearProps: 'transform' }),
  )
  return tl
}
