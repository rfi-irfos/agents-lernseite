import { gsap } from 'gsap'
import { de } from '../content/de'
import { d, el, orbHop, startScene, svgBox } from './common'
import schublade from '../svg/schublade.svg?raw'
import notiz from '../svg/notiz.svg?raw'
import type { SceneBuilder } from './types'

const WOLKE = `
<svg viewBox="0 0 400 240" role="img" aria-label="${de.stationen.gedankenwolke}" preserveAspectRatio="xMidYMid meet">
  <path class="g-base" d="M70 130a36 36 0 0 1 4-70 52 52 0 0 1 98-4 44 44 0 0 1 36 78 34 34 0 0 1-30 38H100a30 30 0 0 1-30-38z" transform="translate(-30 -10) scale(.9)"/>
  <circle class="g-acc-fill" cx="48" cy="118" r="9"/>
  <path class="weg" d="M60 118C130 118 150 40 330 40"/>
  <path class="weg" d="M60 118C150 118 200 118 330 120"/>
  <path class="weg" d="M60 118C130 118 150 200 330 200"/>
  <circle class="ende" cx="338" cy="40" r="9"/>
  <circle class="ende" cx="338" cy="120" r="9"/>
  <circle class="ende" cx="338" cy="200" r="9"/>
</svg>`

/** Gedankenwolke: Wege tauchen als Linien auf, einer wird gewählt. Mit Gedächtnis geht eine Schublade auf. */
export const denken: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  if (ctx.step.script.kurz) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const wrap = el('div', 'denk')
  const wolke = svgBox(WOLKE, 'gedankenwolke')
  wrap.append(wolke)
  const wege = Array.from(wolke.querySelectorAll<SVGPathElement>('.weg'))
  const enden = Array.from(wolke.querySelectorAll<SVGCircleElement>('.ende'))
  const gewaehlt = 1
  stage.append(wrap)

  const lens = wege.map((w) => w.getTotalLength?.() ?? 400)
  wege.forEach((w, i) => gsap.set(w, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }))
  gsap.set(enden, { opacity: 0 })
  tl.to(wege, { strokeDashoffset: 0, duration: d(ctx, 0.6), stagger: d(ctx, 0.2) }, 'handlung')
  tl.to(enden, { opacity: 1, duration: d(ctx, 0.3), stagger: d(ctx, 0.2) }, '<')
  tl.call(() => {
    wege[gewaehlt].classList.add('gewaehlt')
    enden[gewaehlt].classList.add('gewaehlt')
  })
  tl.to(wege.filter((_, i) => i !== gewaehlt), { opacity: 0.35, duration: d(ctx, 0.4) })
  tl.to(enden.filter((_, i) => i !== gewaehlt), { opacity: 0.35, duration: d(ctx, 0.4) }, '<')

  const mem = ctx.step.script.gedaechtnis
  if (mem) {
    const box = el('div', 'gedaechtnis')
    const lade = svgBox(schublade, 'schublade')
    lade.dataset.open = 'false'
    lade.setAttribute('role', 'img')
    lade.setAttribute('aria-label', de.stationen.schublade)
    const note = el('div', 'notiz')
    note.setAttribute('aria-label', de.stationen.erinnerung)
    note.append(svgBox(notiz, 'notiz-bild'))
    const t = el('span')
    t.textContent = mem
    note.append(t)
    box.append(lade, note)
    wrap.append(box)
    const front = lade.querySelector('.lade')
    gsap.set(note, { opacity: 0 })
    tl.call(() => {
      lade.dataset.open = 'true'
    })
    if (front) tl.fromTo(front, { y: 0 }, { y: 18, duration: d(ctx, 0.5) })
    tl.fromTo(note, { opacity: 0, x: -40, y: 20 }, { opacity: 1, x: 0, y: 0, duration: d(ctx, 0.6), clearProps: 'transform' })
  }
  return tl
}
