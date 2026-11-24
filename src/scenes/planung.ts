import { gsap } from 'gsap'
import { de } from '../content/de'
import { d, el, orbHop, startScene } from './common'
import type { SceneBuilder } from './types'

/** Schritte aus `daten.schritte`; ohne Angabe teilt sich der Erzählsatz an Kommas und „und“. */
export function planSchritte(daten: Record<string, unknown> | undefined, text: string): string[] {
  const s = daten?.schritte
  if (Array.isArray(s) && s.every((x) => typeof x === 'string') && s.length) return s as string[]
  const parts = text
    .replace(/[.!?]+$/, '')
    .split(/,| und dann | und /)
    .map((x) => x.trim())
    .filter(Boolean)
  return parts.length ? parts : [text]
}

/** Karten legen: Schritte legen sich nebeneinander und werden nummeriert. */
export const planung: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  if (ctx.step.script.kurz) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const schritte = planSchritte(ctx.step.script.daten, ctx.step.script.text)
  const list = el('ol', 'plan')
  list.setAttribute('aria-label', de.stationen.plan)
  const cards = schritte.map((s, i) => {
    const li = el('li', 'plankarte')
    const nr = el('span', 'plan-nr')
    nr.textContent = String(i + 1)
    nr.setAttribute('aria-label', `${de.stationen.schritt} ${i + 1}`)
    const t = el('span')
    t.textContent = s
    li.append(nr, t)
    list.append(li)
    return li
  })
  stage.append(list)
  const nrs = cards.map((c) => c.querySelector('.plan-nr') as HTMLElement)
  gsap.set(cards, { opacity: 0 })
  gsap.set(nrs, { opacity: 0 })
  tl.fromTo(
    cards,
    { opacity: 0, y: -24, rotation: () => gsap.utils.random(-6, 6) },
    { opacity: 1, y: 0, rotation: 0, duration: d(ctx, 0.5), stagger: d(ctx, 0.25), clearProps: 'transform' },
    'handlung',
  )
  tl.to(nrs, { opacity: 1, duration: d(ctx, 0.3), stagger: d(ctx, 0.2) })
  return tl
}
