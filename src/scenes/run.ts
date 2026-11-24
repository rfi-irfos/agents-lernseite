import { gsap } from 'gsap'
import { QUIZ_TIMEOUT_MS, type Player } from '../engine/player'
import type { Scenario } from '../engine/types'
import type { Sound } from '../engine/sound'
import type { Field } from '../fx/field'
import { isTest, reducedMotion } from '../env'
import { AGENT_EVENT } from '../ui/quiz'
import { sceneFor } from './registry'
import type { SceneCtx } from './types'

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
  let quizMs = 0

  const enter = () => {
    const my = ++token
    tl?.kill()
    slots.buehne.replaceChildren()
    slots.text.querySelectorAll('.erzaehl').forEach((n) => n.remove())
    holding = false
    quizMs = 0
    const step = player.step
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
        answer: (i) => {
          if (my !== token) return { richtig: false }
          if (player.state === 'paused') player.play()
          return player.answerQuiz(i)
        },
      },
    }
    player.beginTransition() // Text zuerst: die Lesezeit zählt erst, wenn der Text steht
    gsap.delayedCall(SAFETY_S, () => {
      if (my === token) player.endTransition()
    })
    tl = sceneFor(step.station, o.scenario.art)(ctx)
  }

  const offStep = player.on('step', enter)

  const tick = (_t: number, dtMs: number) => {
    const ms = Math.min(dtMs, MAX_DT)
    if (player.state === 'quiz') {
      if (holding) return
      quizMs += ms
      if (quizMs >= QUIZ_TIMEOUT_MS) {
        const quiz = slots.buehne.querySelector('.quiz')
        if (quiz) {
          holding = true
          quiz.dispatchEvent(new CustomEvent(AGENT_EVENT))
          return
        }
        player.tick(ms)
      }
      return
    }
    player.tick(ms)
  }
  const auto = o.autoTick ?? autoTickDefault()
  if (auto) gsap.ticker.add(tick)

  return () => {
    offStep()
    if (auto) gsap.ticker.remove(tick)
    tl?.kill()
  }
}
