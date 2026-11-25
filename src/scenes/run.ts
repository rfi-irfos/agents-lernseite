import { gsap } from 'gsap'
import type { Player } from '../engine/player'
import type { Scenario } from '../engine/types'
import type { Sound } from '../engine/sound'
import type { Field } from '../fx/field'
import { dur, isTest, pushEvent, reducedMotion } from '../env'
import { AGENT_EVENT } from '../ui/quiz'
import { sceneFor } from './registry'
import type { SceneCtx } from './types'
import { mountWelt } from './welt'

const MAX_DT = 100 // ms; nach Tab-Wechsel nicht aufholen
const SAFETY_S = 3 // Notausgang, falls eine Szene den Text nie meldet

interface Opts {
  app: HTMLElement
  player: Player
  field: Field
  scenario: Scenario
  eingabe: string
  sound: Sound
  /** Takt von außen; Standard gsap.ticker. Im Testmodus läuft nichts von allein, außer mit ?auto=1. */
  autoTick?: boolean
}

function autoTickDefault(): boolean {
  if (!isTest()) return true
  try {
    return new URLSearchParams(location.search).get('auto') === '1'
  } catch {
    return false
  }
}

/**
 * Treibt den Player mit gsap.ticker und spielt bei jedem Schritt die Szene der Station.
 * Der Player bleibt die einzige Quelle dafür, welcher Schritt aktiv ist.
 */
export function runScenes(o: Opts): () => void {
  const { app, player } = o
  const slot = (n: string) => app.querySelector<HTMLElement>(`[data-slot=${n}]`)!
  const slots = { buehne: slot('buehne'), text: slot('text'), eingabe: slot('eingabe') }
  let tl: gsap.core.Timeline | null = null
  let token = 0
  let holding = false
  let calls: gsap.core.Tween[] = []
  let safety: gsap.core.Tween | undefined
  let first = true
  let einzug: gsap.core.Tween | null = null
  const welt = mountWelt(slot('fx'), slots.buehne, reducedMotion())

  /**
   * Stationswechsel ohne harten Schnitt: die alte Szene zieht sich zur Mitte zurück und blendet aus,
   * die Welt dahinter bleibt stehen. Gibt die Dauer des Abgangs zurück.
   */
  const abgang = (): number => {
    const reduced = reducedMotion()
    const raus = dur(reduced ? 0.1 : 0.32)
    for (const ch of Array.from(slots.buehne.children) as HTMLElement[]) {
      if (ch.classList.contains('stage-raus')) continue
      if (!ch.classList.contains('stage') || raus === 0) {
        ch.remove()
        continue
      }
      ch.classList.replace('stage', 'stage-raus')
      ch.inert = true
      ch.setAttribute('aria-hidden', 'true')
      gsap.killTweensOf(ch)
      gsap.to(ch, {
        ...(reduced ? {} : { scale: 0.86, filter: 'blur(6px)' }),
        opacity: 0,
        duration: raus,
        ease: 'power2.in',
        onComplete: () => ch.remove(),
      })
    }
    return raus
  }

  const enter = () => {
    const my = ++token
    tl?.kill()
    einzug?.kill()
    const raus = abgang()
    slots.text.querySelectorAll('.erzaehl').forEach((n) => n.remove())
    slots.eingabe.querySelectorAll('.chatblase').forEach((n) => n.remove())
    holding = false
    calls.forEach((c) => c.kill())
    calls = []
    const step = player.step
    // Ein Klang je Stationswechsel: der Schleifenstart meldet sich mit „hinweis“, sonst „wisch“; die erste Station nach dem Eintauchen bleibt still.
    if (!first) o.sound.play(step.loopStart ? 'hinweis' : 'wisch')
    welt.zeige(step, player.index, player.total, first)
    first = false
    app.dataset.station = step.station
    app.style.setProperty('--c', `var(--c-${step.station})`)
    const ctx: SceneCtx = {
      slots,
      field: o.field,
      step,
      scenario: o.scenario,
      eingabe: o.eingabe,
      format: (app.dataset.format ?? 'quer') as SceneCtx['format'],
      reduced: reducedMotion(),
      sound: o.sound,
      textReady: () => {
        if (my === token) player.endTransition()
      },
      quiz: {
        hold: () => {
          if (my === token) holding = true
        },
        resume: () => {
          if (my === token && player.state === 'paused') player.play()
        },
        answer: (i) => {
          if (my !== token) return
          if (player.state !== 'paused') {
            player.answerQuiz(i)
            return
          }
          // Pause gilt: erst bei Weiter antworten (oder verfallen, wenn die Station gewechselt wird)
          const off = player.on('state', (p) => {
            if (my !== token) return off()
            if (p.state === 'paused') return
            off()
            player.answerQuiz(i)
          })
        },
        later: (seconds, fn) => {
          calls.push(gsap.delayedCall(seconds, () => my === token && fn()))
        },
      },
    }
    player.beginTransition() // Text zuerst: die Lesezeit zählt erst, wenn der Text steht
    safety?.kill()
    safety = gsap.delayedCall(SAFETY_S, () => {
      if (my === token) player.endTransition()
    })
    tl = sceneFor(step.station, o.scenario.art)(ctx)
    // Einzug: die neue Szene wächst aus der Mitte heraus, sobald die alte weg ist.
    const neu = slots.buehne.querySelector<HTMLElement>(':scope > .stage')
    if (neu && raus > 0) {
      tl.delay(raus)
      const reduced = ctx.reduced
      einzug = gsap.fromTo(
        neu,
        reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          ...(reduced ? {} : { scale: 1 }),
          duration: dur(reduced ? 0.15 : 0.55),
          delay: raus,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        },
      )
    }
    // Meldet das Ende der Szene (für Tests und das Kontaktblatt): data-szene=fertig, Ereignis szene-fertig.
    app.dataset.szene = 'laeuft'
    const fertig = () => {
      if (my !== token) return
      app.dataset.szene = 'fertig'
      pushEvent({ type: 'szene-fertig', index: player.index })
    }
    if (tl.totalDuration() === 0 || tl.progress() === 1) fertig()
    else tl.eventCallback('onComplete', fertig)
  }

  const offStep = player.on('step', enter)
  const offDone = player.on('done', () => welt.ruhe())

  // Nach 8 s im Auto-Modus meldet der Player den Zeitablauf; die Oberfläche zeigt die Wahl des Agenten.
  const offTimeout = player.on('quizTimeout', () => {
    if (holding) return
    const quiz = slots.buehne.querySelector(':scope > .stage .quiz')
    if (quiz) {
      holding = true
      quiz.dispatchEvent(new CustomEvent(AGENT_EVENT))
    } else player.answerQuiz(player.step.script.werkzeug?.richtig ?? 0)
  })

  const tick = (_t: number, dtMs: number) => {
    if (holding && player.state === 'quiz') return
    player.tick(Math.min(dtMs, MAX_DT))
  }
  const auto = o.autoTick ?? autoTickDefault()
  if (auto) gsap.ticker.add(tick)

  return () => {
    token++ // verspätete Rückrufe (Notausgang, Quiz) verfallen
    offStep()
    offDone()
    offTimeout()
    calls.forEach((c) => c.kill())
    if (auto) gsap.ticker.remove(tick)
    safety?.kill()
    tl?.kill()
    einzug?.kill()
    welt.weg()
  }
}
