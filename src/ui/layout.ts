import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import type { Format } from '../engine/types'

gsap.registerPlugin(Flip)

const DURATION = 0.5
const FADE = 0.1

function app(): HTMLElement | null {
  return document.getElementById('app')
}

function reduced(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Setzt das Format. Der erste Aufruf setzt nur, jeder weitere morpht (Flip, 500 ms) oder blendet bei reduzierter Bewegung (2 × 100 ms). */
export function applyFormat(f: Format): void {
  const root = app()
  if (!root) return
  const prev = root.dataset.format
  if (prev === f) return
  if (!prev) {
    root.dataset.format = f
    return
  }
  gsap.killTweensOf(root)
  if (reduced()) {
    gsap.to(root, {
      opacity: 0,
      duration: FADE,
      ease: 'power2.inOut',
      onComplete: () => {
        root.dataset.format = f
        gsap.to(root, { opacity: 1, duration: FADE, ease: 'power2.inOut', clearProps: 'opacity' })
      },
    })
    return
  }
  const slots = gsap.utils.toArray<HTMLElement>('[data-slot]:not([data-slot=fx])', root)
  Flip.killFlipsOf(slots)
  const state = Flip.getState(slots)
  root.dataset.format = f
  Flip.from(state, { duration: DURATION, ease: 'power2.inOut', scale: false, overwrite: true })
}
