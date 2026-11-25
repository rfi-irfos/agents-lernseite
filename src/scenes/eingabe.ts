import { gsap } from 'gsap'
import { de } from '../content/de'
import { d, el, startScene, streamBetween, tv } from './common'
import type { SceneBuilder } from './types'

/** Eingabe: die Frage steht als Sprechblase da und reist als Daten-Kugel zum Agenten. */
export const eingabe: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const wrap = el('div', 'eing')
  const blase = el('p', 'eing-frage')
  blase.textContent = ctx.eingabe
  const leitung = el('div', 'eing-leitung')
  const orb = el('div', 'orb eing-orb')
  orb.setAttribute('aria-hidden', 'true')
  leitung.append(orb)
  const agent = el('div', 'eing-agent')
  const kern = el('span', 'eing-kern')
  kern.setAttribute('aria-hidden', 'true')
  const name = el('span', 'eing-name')
  name.textContent = de.stationen.agent
  agent.append(kern, name)
  wrap.append(blase, leitung, agent)
  stage.append(wrap)

  gsap.set(orb, { opacity: 0 })
  tl.fromTo(
    blase,
    tv(ctx, { opacity: 0, y: 20, scale: 0.94 }),
    tv(ctx, { opacity: 1, y: 0, scale: 1, duration: d(ctx, 0.5), clearProps: 'transform' }),
    'handlung',
  )
  tl.fromTo(agent, { opacity: 0 }, { opacity: 1, duration: d(ctx, 0.5) }, '<')
  tl.fromTo(leitung, tv(ctx, { opacity: 0, scaleY: 0, transformOrigin: '50% 0%' }), tv(ctx, { opacity: 1, scaleY: 1, duration: d(ctx, 0.4), clearProps: 'transform' }))
  tl.call(() => streamBetween(ctx, blase, agent, 700))
  tl.to(orb, { opacity: 1, duration: d(ctx, 0.15) })
  if (!ctx.reduced) tl.fromTo(orb, { top: '0%' }, { top: '100%', duration: d(ctx, 0.7), ease: 'power2.in' })
  tl.to(orb, { opacity: 0, duration: d(ctx, 0.15) })
  tl.call(() => agent.classList.add('an'))
  if (!ctx.reduced) tl.fromTo(kern, { scale: 1 }, { scale: 1.25, duration: d(ctx, 0.25), yoyo: true, repeat: 1, clearProps: 'transform' })
  return tl
}
