import { gsap } from 'gsap'
import { wordCards } from '../engine/matcher'
import { d, el, tv, orbHop, startScene, streamBetween, wichtigeWoerter } from './common'
import type { SceneBuilder } from './types'

/** Zerlegen: Der Satz fällt in Wortkarten auseinander, wichtige Wörter leuchten. */
export const wahrnehmung: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  if (ctx.step.script.kurz) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const worte = wordCards(ctx.eingabe)
  const wrap = el('div', 'wn')
  const satz = el('p', 'wn-satz')
  satz.textContent = ctx.eingabe
  const list = el('ul', 'wn-karten')
  const wichtig = wichtigeWoerter(worte, ctx.step.script.text)
  const cards = worte.map((w, i) => {
    const li = el('li', 'wortkarte')
    li.textContent = w
    if (wichtig.has(i)) li.dataset.wichtig = 'true'
    list.append(li)
    return li
  })
  wrap.append(satz, list)
  stage.append(wrap)

  tl.fromTo(satz, { opacity: 0 }, { opacity: 1, duration: d(ctx, 0.3) }, 'handlung')
  tl.call(() => ctx.sound.play('wisch'))
  tl.fromTo(
    cards,
    tv(ctx, { opacity: 0, y: () => gsap.utils.random(-28, -12), rotation: () => gsap.utils.random(-8, 8) }),
    tv(ctx, { opacity: 1, y: 0, rotation: 0, duration: d(ctx, 0.5), stagger: d(ctx, 0.08), clearProps: 'transform' }),
    '>',
  )
  tl.to(satz, { opacity: 0.35, duration: d(ctx, 0.3) }, '<')
  tl.call(() => {
    cards.forEach((c) => c.dataset.wichtig === 'true' && c.classList.add('wichtig'))
    cards.find((c) => c.classList.contains('wichtig')) && streamBetween(ctx, satz, list, 700)
  })
  if (!ctx.reduced) {
    tl.fromTo(
      cards.filter((c) => c.dataset.wichtig === 'true'),
      { scale: 1 },
      { scale: 1.08, duration: d(ctx, 0.3), yoyo: true, repeat: 1, stagger: d(ctx, 0.15), clearProps: 'transform' },
    )
  }
  return tl
}
