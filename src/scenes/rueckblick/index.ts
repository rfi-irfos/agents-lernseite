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
  /** Lesezeit der Antwort in ms (Tempo eingerechnet): so lange bleibt die voll sichtbare Blase stehen. */
  lesezeitMs: number
}

/** Kurze Nachfrist, wenn der Ablauf die Haltezeit der Antwort schon selbst abgewartet hat. */
export const GRACE_MS = 600

/**
 * Zeitpunkt, an dem der Rückblick beginnt: Ende der Lesezeit (ab voll sichtbarer Blase), aber mindestens
 * `GRACE_MS` nach `done`. Wurde der Schritt übersprungen, ist die Blase erst kurz vor `done` sichtbar,
 * dann gilt praktisch die volle Lesezeit.
 */
export function beginAt(shownAt: number, doneAt: number, holdMs: number): number {
  return Math.max(shownAt + holdMs, doneAt + GRACE_MS)
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

  // Die Antwort-Blase bleibt, bis sie voll sichtbar war und ihre Lesezeit um ist; erst dann blendet alles aus.
  const old = [...Array.from(o.buehne.children), ...Array.from(o.text.children), ...Array.from(o.eingabe.children)]
  // Im Testmodus ohne echte Dauern genügt eine kurze feste Pause, damit der Done-Zustand beobachtbar bleibt.
  const hold = dur(1) === 0 ? 1200 : Math.max(o.lesezeitMs, 100)
  const began = performance.now()
  let shownAt: number | null = null
  let started = false
  const begin = () => {
    started = true
    gsap.ticker.remove(poll)
    fade = gsap.to(old, {
      opacity: 0,
      duration: d(0.4),
      ease: 'power2.inOut',
      onComplete: () => {
        o.eingabe.replaceChildren()
        enter(0, false)
      },
    })
  }
  const poll = () => {
    if (!alive || started) return gsap.ticker.remove(poll)
    const now = performance.now()
    const blase = o.eingabe.querySelector<HTMLElement>('.chatblase')
    if (shownAt === null && blase) {
      const marked = Number(blase.dataset.shownAt)
      if (marked > 0) shownAt = marked
      else if (!gsap.isTweening(blase) && Number(getComputedStyle(blase).opacity) >= 0.99) shownAt = now
    }
    // Notausgang: ohne Blase zählt die Zeit seit done
    if (shownAt !== null ? now >= beginAt(shownAt, began, hold) : !blase && now - began >= hold) begin()
    else if (now - began > hold + 10_000) begin()
  }
  gsap.ticker.add(poll)

  return () => {
    alive = false
    gsap.ticker.remove(poll)
    fade?.kill()
    handle?.kill()
  }
}
