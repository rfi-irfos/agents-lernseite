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

  if (ctx.reduced) {
    const f = dur(0.1)
    tl.to(startParts, { opacity: 0, duration: f })
    if (gate) tl.to(gate, { opacity: 0, duration: f }, '<')
    tl.call(toPlay)
    tl.set([buehne, text], { opacity: 0 })
    tl.to([buehne, text], { opacity: 1, duration: f, clearProps: 'opacity' })
    return tl
  }

  // 1. Tor
  tl.to(startParts, { opacity: 0, duration: dur(0.35) }, 0)
  if (gate) {
    tl.to(gate, { boxShadow: `0 0 0 ${4}px ${focus}`, borderColor: focus, duration: dur(0.35) }, 0)
  }
  // 2. Flug hinein
  tl.call(toPlay, undefined, dur(0.35))
  tl.set([buehne, text], { opacity: 0 }, dur(0.35))
  tl.fromTo(
    buehne,
    { scale: 0.6, opacity: 0, transformOrigin: '50% 100%' },
    { scale: 1, opacity: 1, duration: dur(0.9), clearProps: 'transform,opacity' },
    dur(0.35),
  )
  tl.to(text, { opacity: 1, duration: dur(0.5), clearProps: 'opacity' }, dur(0.75))
  tl.call(() => { void ctx.field.dive(dur(900)) }, undefined, dur(0.35))
  tl.call(() => ctx.sound.play('eintauchen'), undefined, dur(0.35))
  if (gate) tl.to(gate, { opacity: 0, duration: dur(0.4) }, dur(0.6))

  // 3. Daten-Kugel
  const orb = document.createElement('div')
  orb.className = 'orb'
  orb.setAttribute('aria-hidden', 'true')
  tl.call(() => {
    const b = buehne.getBoundingClientRect()
    const g = (gate ?? eingabe).getBoundingClientRect()
    buehne.append(orb)
    gsap.set(orb, { left: g.left + g.width / 2 - b.left, top: g.top + g.height / 2 - b.top, opacity: 0 })
  }, undefined, dur(1.0))
  tl.to(orb, { opacity: 1, duration: dur(0.15) }, dur(1.0))
  tl.to(orb, { left: '50%', top: '45%', duration: dur(0.6) }, dur(1.0))
  tl.to(orb, { opacity: 0, duration: dur(0.2), onComplete: () => orb.remove() }, dur(1.6))
  return tl
}
