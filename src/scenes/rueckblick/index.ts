import { gsap } from 'gsap'
import { dur, pushEvent } from '../../env'
import type { Scenario } from '../../engine/types'
import { el } from '../common'
import { auswahl } from './auswahl'
import { besser } from './besser'
import { kreislauf } from './kreislauf'
import type { PartCtx, PartHandle } from './types'

export interface RueckblickOpts {
  buehne: HTMLElement
  text: HTMLElement
  eingabe: HTMLElement
  reduced: boolean
  scenarios: Scenario[]
  seen: () => string[]
  onPick: (s: Scenario) => void
}

type Teil = 'kreislauf' | 'besser' | 'auswahl'
const TEILE: Teil[] = ['kreislauf', 'besser', 'auswahl']

/**
 * Rückblick nach `done`: Kreislauf, „Wird der Agent besser?“, Auswahl des nächsten Ablaufs.
 * Gibt eine Aufräum-Funktion zurück (Animationen und Verzögerungen enden, die Slots räumt der Aufrufer).
 */
export function mountRueckblick(o: RueckblickOpts): () => void {
  const d = (s: number) => dur(o.reduced ? Math.min(s, 0.2) : s)
  let alive = true
  let handle: PartHandle | undefined
  let fade: gsap.core.Tween | undefined
  let stage: HTMLElement | undefined
  let text: HTMLElement | undefined

  const enter = (i: number, focus: boolean) => {
    if (!alive) return
    const teil = TEILE[i]
    stage = el('div', 'rb-stage')
    text = el('div', 'rb-text')
    o.buehne.replaceChildren(stage)
    o.text.replaceChildren(text)
    const ctx: PartCtx = { stage, text, reduced: o.reduced, d, weiter: i < TEILE.length - 1 ? () => leave(i + 1) : undefined }
    handle =
      teil === 'kreislauf'
        ? kreislauf(ctx)
        : teil === 'besser'
          ? besser(ctx)
          : auswahl(ctx, o.scenarios, o.seen(), o.onPick)
    pushEvent({ type: 'rueckblick', teil })
    fade = gsap.fromTo(
      [stage, text],
      o.reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: d(0.4), ease: 'power2.inOut', clearProps: 'opacity,transform' },
    )
    if (focus) handle.focus?.()
  }

  const leave = (next: number) => {
    if (!alive || !stage || !text) return
    handle?.kill()
    fade?.kill()
    const out = [stage, text]
    // Der Fokus bleibt nie im verschwindenden Teil hängen.
    fade = gsap.to(out, {
      opacity: 0,
      duration: d(0.3),
      ease: 'power2.inOut',
      onComplete: () => enter(next, true),
    })
  }

  // Die Antwort-Blase und der letzte Szenentext blenden aus, dann beginnt der Kreislauf.
  const old = [...Array.from(o.buehne.children), ...Array.from(o.text.children), ...Array.from(o.eingabe.children)]
  const start = gsap.delayedCall(d(o.reduced ? 0.1 : 1.2), () => {
    if (!alive) return
    fade = gsap.to(old, {
      opacity: 0,
      duration: d(0.4),
      ease: 'power2.inOut',
      onComplete: () => {
        o.eingabe.replaceChildren()
        enter(0, false)
      },
    })
  })

  return () => {
    alive = false
    start.kill()
    fade?.kill()
    handle?.kill()
  }
}
