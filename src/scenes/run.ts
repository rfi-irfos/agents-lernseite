import { gsap } from 'gsap'
import type { Player } from '../engine/player'
import type { Scenario } from '../engine/types'
import type { Sound } from '../engine/sound'
import type { Field } from '../fx/field'
import { isTest, pushEvent, reducedMotion } from '../env'
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
  let calls: gsap.core.Tween[] = []
  let safety: gsap.core.Tween | undefined
  let first = true

  const enter = () => {
    const my = ++token
    tl?.kill()
    slots.buehne.replaceChildren()
    slots.text.querySelectorAll('.erzaehl').forEach((n) => n.remove())
    slots.eingabe.querySelectorAll('.chatblase').forEach((n) => n.remove())
    holding = false
    calls.forEach((c) => c.kill())
    calls = []
    const step = player.step
    // Ein Klang je Stationswechsel: der Schleifenstart meldet sich mit „hinweis“, sonst „wisch“; die erste Station nach dem Eintauchen bleibt still.
    if (!first) o.sound.play(step.loopStart ? 'hinweis' : 'wisch')
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

  // Nach 8 s im Auto-Modus meldet der Player den Zeitablauf; die Oberfläche zeigt die Wahl des Agenten.
  const offTimeout = player.on('quizTimeout', () => {
    if (holding) return
    const quiz = slots.buehne.querySelector('.quiz')
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
    offTimeout()
    calls.forEach((c) => c.kill())
    if (auto) gsap.ticker.remove(tick)
    safety?.kill()
    tl?.kill()
  }
}
