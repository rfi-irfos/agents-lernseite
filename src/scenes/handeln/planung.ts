import { de } from '../../content/de'
import { parseHandelnDaten } from '../../engine/handeln'
import { d, el, orbHop, startScene, svgBox, tv } from '../common'
import { svgRaw } from '../svg'
import type { SceneBuilder } from '../types'

/** Reise: eine Karte mit Route, die Haltepunkte erscheinen nacheinander. */
export const planungHandeln: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const daten = parseHandelnDaten('planung', ctx.step.script.daten)
  if (!daten) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const route = el('div', 'route')
  route.append(svgBox(svgRaw('karte'), 'route-karte'))
  const liste = el('ol', 'route-punkte')
  liste.setAttribute('aria-label', de.stationen.route)
  const punkte = daten.punkte.map((p) => {
    const li = el('li', 'routenpunkt')
    const punkt = el('span', 'routenpunkt-marke')
    punkt.setAttribute('aria-hidden', 'true')
    const ort = el('strong')
    ort.textContent = p.ort
    const zeit = el('span')
    zeit.textContent = p.zeit
    li.append(punkt, ort, zeit)
    liste.append(li)
    return li
  })
  route.append(liste)
  stage.append(route)
  tl.fromTo(
    punkte,
    tv(ctx, { opacity: 0, x: -40 }),
    tv(ctx, { opacity: 1, x: 0, duration: d(ctx, 0.5), stagger: d(ctx, 0.35), clearProps: 'transform' }),
    'handlung',
  )
  return tl
}
