import { gsap } from 'gsap'
import { de } from '../content/de'
import { readingMs } from '../engine/reading-time'
import { isTest } from '../env'
import { mountQuiz } from '../ui/quiz'
import { d, el, orbHop, startScene, streamBetween } from './common'
import { iconSvg } from './werkzeug-icons'
import type { SceneBuilder } from './types'

/** Werkzeugkasten: drei Werkzeuge stehen zur Wahl (Mitmach-Frage), der Agent greift eines. */
export const werkzeug: SceneBuilder = (ctx) => {
  const { tl, stage, satz } = startScene(ctx)
  const w = ctx.step.script.werkzeug
  if (ctx.step.script.kurz && !w) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const wrap = el('div', 'wz')
  stage.append(wrap)

  if (!w || !ctx.quiz) {
    // zweiter Durchlauf (ohne Frage): der Agent greift sein Werkzeug
    const icon = ctx.step.script.daten?.icon
    const g = el('div', 'wz-gegriffen')
    const bild = el('span', 'werkzeug-bild')
    bild.innerHTML = iconSvg(typeof icon === 'string' ? icon : '')
    const cap = el('span')
    cap.textContent = de.stationen.ersteWahl
    g.append(bild, cap)
    wrap.append(g)
    gsap.set(g, { opacity: 0 })
    tl.fromTo(g, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: d(ctx, 0.5), clearProps: 'transform' }, 'handlung')
    return tl
  }

  const quiz = ctx.quiz
  const q = ctx.step.script.werkzeug!
  const onPick = (i: 0 | 1 | 2) => {
    quiz.hold()
    const richtig = i === q.richtig
    const root = wrap.querySelector<HTMLElement>('.quiz')
    if (root) streamBetween(ctx, root.querySelectorAll('.quizkarte')[i], satz, 600)
    ctx.sound.play(richtig ? 'richtig' : 'hinweis')
    let wait: number
    if (richtig) {
      wait = isTest() ? 0.3 : 1.2
    } else {
      gsap.to(satz, {
        opacity: 0,
        duration: d(ctx, 0.2),
        onComplete: () => {
          satz.textContent = q.erklaerung
          gsap.to(satz, { opacity: 1, duration: d(ctx, 0.3) })
        },
      })
      wait = isTest() ? 0.5 : readingMs(q.erklaerung) / 1000
    }
    gsap.delayedCall(wait, () => quiz.answer(i))
  }
  tl.call(
    () => {
      mountQuiz(wrap, q, onPick)
      const cards = wrap.querySelectorAll('.quizkarte')
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: d(ctx, 0.5), stagger: d(ctx, 0.12), clearProps: 'transform', ease: 'power2.inOut' },
      )
    },
    undefined,
    'handlung',
  )
  return tl
}
