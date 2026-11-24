import { de } from '../../content/de'
import { parseHandelnDaten } from '../../engine/handeln'
import { d, el, orbHop, startScene, svgBox, tv } from '../common'
import { svgRaw } from '../svg'
import type { SceneBuilder } from '../types'

/** Suche: Ergebnisse fliegen von rechts herein. */
export const suche: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const daten = parseHandelnDaten('suche', ctx.step.script.daten)
  if (!daten) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const list = el('ul', 'treffer-liste')
  list.setAttribute('aria-label', de.stationen.treffer)
  const cards = daten.treffer.map((t) => {
    const li = el('li', 'treffer')
    li.append(svgBox(svgRaw('lupe'), 'treffer-icon'))
    const txt = el('span', 'treffer-text')
    const titel = el('strong')
    titel.textContent = t.titel
    const detail = el('span')
    detail.textContent = t.detail
    txt.append(titel, detail)
    li.append(txt)
    list.append(li)
    return li
  })
  stage.append(list)
  tl.fromTo(
    cards,
    tv(ctx, { opacity: 0, x: 80 }),
    tv(ctx, { opacity: 1, x: 0, duration: d(ctx, 0.5), stagger: d(ctx, 0.2), clearProps: 'transform' }),
    'handlung',
  )
  return tl
}
