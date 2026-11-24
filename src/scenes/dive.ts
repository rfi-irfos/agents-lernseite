import { gsap } from 'gsap'
import { dur } from '../env'
import type { SceneBuilder } from './types'

const EASE = 'power2.inOut'

/**
 * Eintauchen, ca. 1,6 s:
 * 1. Das Eingabefeld wächst zum Rahmen (Tor), der Startinhalt blendet aus.
 * 2. Die Kamera fliegt hinein: Bühne 0.6 → 1, blendet ein, Partikel strömen.
 * 3. Die Daten-Kugel löst sich aus dem Text.
 * Bei reduzierter Bewegung nur Überblendung (2 × 100 ms), im Testmodus alle Dauern 0.
 */
export const dive: SceneBuilder = (ctx) => {
  const { buehne, text, eingabe } = ctx.slots
  const app = buehne.parentElement as HTMLElement
  const tl = gsap.timeline({ defaults: { ease: EASE } })
  const startParts = [
    buehne.querySelector('.start-body'),
    text.querySelector('.start-note'),
  ].filter((x): x is Element => !!x)
  const gate = eingabe.querySelector<HTMLElement>('.start-form')
  const focus = getComputedStyle(document.documentElement).getPropertyValue('--focus').trim() || '#0060b8'

  const toPlay = () => {
    app.dataset.phase = 'play'
  }

  /** Am Ende immer sichtbar und ohne Reste: auch wenn alle Dauern 0 sind (Testmodus), wo Setzen und Einblenden am selben Punkt liegen. */
  const settle = () => {
    gsap.set([buehne, text], { clearProps: 'opacity' })
    gsap.set(buehne, { clearProps: 'transform,transformOrigin' })
  }

  if (ctx.reduced) {
    const f = dur(0.1)
    tl.to(startParts, { opacity: 0, duration: f })
    if (gate) tl.to(gate, { opacity: 0, duration: f }, '<')
    tl.call(toPlay)
    tl.set([buehne, text], { opacity: 0 })
    tl.to([buehne, text], { opacity: 1, duration: f, clearProps: 'opacity' })
    tl.call(settle)
    return tl
  }

  // 1. Tor: das Eingabefeld wächst (gemessen, Position und Größe) zum Rahmen der Bühne
  const B = 0.4
  tl.to(startParts, { opacity: 0, duration: dur(0.3) }, 0)
  if (gate) {
    const from = gate.getBoundingClientRect()
    const slotH = eingabe.getBoundingClientRect().height
    const to = buehne.getBoundingClientRect()
    const kids = Array.from(gate.children)
    tl.set(eingabe, { height: slotH }, 0)
    tl.set(
      gate,
      { position: 'fixed', zIndex: 2, boxSizing: 'border-box', left: from.left, top: from.top, width: from.width, height: from.height },
      0,
    )
    tl.to(kids, { opacity: 0, duration: dur(0.2) }, 0)
    tl.to(gate, { left: to.left, top: to.top, width: to.width, height: to.height, borderColor: focus, duration: dur(B) }, 0)
  }
  // 2. Flug hinein: Bühne 0.6 → 1, das Tor blendet dabei aus
  tl.call(toPlay, undefined, dur(B))
  tl.set([buehne, text], { opacity: 0 }, dur(B))
  tl.fromTo(
    buehne,
    { scale: 0.6, opacity: 0, transformOrigin: '50% 100%' },
    { scale: 1, opacity: 1, duration: dur(0.9), clearProps: 'transform,opacity' },
    dur(B),
  )
  tl.to(text, { opacity: 1, duration: dur(0.5), clearProps: 'opacity' }, dur(B + 0.4))
  tl.call(() => { void ctx.field.dive(dur(900)) }, undefined, dur(B))
  tl.call(() => ctx.sound.play('eintauchen'), undefined, dur(B))
  if (gate) {
    tl.to(gate, { opacity: 0, duration: dur(0.5) }, dur(B + 0.2))
    tl.to(
      eingabe,
      {
        height: () => parseFloat(getComputedStyle(eingabe).minHeight) || 0,
        duration: dur(0.5),
        clearProps: 'height',
      },
      dur(B + 0.2),
    )
  }

  // 3. Daten-Kugel
  const orb = document.createElement('div')
  orb.className = 'orb'
  orb.setAttribute('aria-hidden', 'true')
  tl.call(() => {
    const b = buehne.getBoundingClientRect()
    const g = (gate ?? eingabe).getBoundingClientRect()
    buehne.append(orb)
    gsap.set(orb, { left: g.left + g.width / 2 - b.left, top: g.top + g.height / 2 - b.top, opacity: 0 })
  }, undefined, dur(B + 0.65))
  tl.to(orb, { opacity: 1, duration: dur(0.15) }, dur(B + 0.65))
  tl.to(orb, { left: '50%', top: '45%', duration: dur(0.6) }, dur(B + 0.65))
  tl.to(orb, { opacity: 0, duration: dur(0.2), onComplete: () => orb.remove() }, dur(B + 1.25))
  tl.call(settle)
  return tl
}
