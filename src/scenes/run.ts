import { gsap } from 'gsap'
import type { Player } from '../engine/player'
import type { Scenario } from '../engine/types'
import type { Sound } from '../engine/sound'
import type { Field } from '../fx/field'
import { dur, isTest, pushEvent, reducedMotion } from '../env'
import { AGENT_EVENT } from '../ui/quiz'
import { sceneFor } from './registry'
import type { SceneCtx } from './types'
import { mountKarte } from './karte'
import { mountWelt } from './welt'
import type { Step } from '../engine/steps'

const MAX_DT = 100 // ms; nach Tab-Wechsel nicht aufholen
const FLUG_S = 1.2 // Kamerafahrt vor der Szene
const SAFETY_S = 3 // Notausgang, falls eine Szene den Text nie meldet

/**
 * Passt eine Szene in die Bühne ein: ist ihr Inhalt höher oder breiter als der Platz, wird die ganze Szene
 * verkleinert. Die CSS-Eigenschaft scale bleibt neben den transform-Animationen von GSAP bestehen.
 */
function passeEin(stage: HTMLElement): void {
  if (!stage.classList.contains('stage')) return
  stage.style.scale = ''
  const cs = getComputedStyle(stage)
  const platzH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  const platzB = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  let oben = Infinity
  let unten = -Infinity
  let breit = 0
  for (const k of Array.from(stage.children) as HTMLElement[]) {
    if (getComputedStyle(k).position === 'absolute') continue
    oben = Math.min(oben, k.offsetTop)
    unten = Math.max(unten, k.offsetTop + Math.max(k.offsetHeight, k.scrollHeight))
    breit = Math.max(breit, k.offsetWidth, k.scrollWidth)
  }
  if (unten <= oben || platzH <= 0 || platzB <= 0) return
  const f = Math.min(1, platzH / (unten - oben), platzB / breit)
  let g = f
  if (g < 0.995) stage.style.scale = String(g)
  // Nachmessen: verschachtelter Inhalt kann über die eigenen Kinder hinausragen.
  const b = stage.parentElement
  for (let i = 0; b && i < 16 && g > 0.4 && (b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1); i++) {
    g *= 0.94
    stage.style.scale = String(g)
  }
}

interface Opts {
  app: HTMLElement
  player: Player
  steps: Step[]
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
  let passung: (() => void) | null = null
  const welt = mountWelt(slot('fx'))
  const karte = mountKarte(slots.buehne, {
    steps: o.steps,
    reduced: reducedMotion(),
    onWahl: (i) => player.goTo(i),
  })
  // Wer die Steuerung benutzt, will dem Ablauf wieder folgen.
  const folge = () => karte.folge()
  slot('steuerung').addEventListener('click', folge, true)

  const enter = () => {
    const my = ++token
    // Die alte Szene bleibt als fertiges Bild in ihrem Knoten stehen.
    tl?.progress(1, true).kill()
    einzug?.progress(1).kill()
    passung?.()
    passung = null
    slots.text.querySelectorAll('.erzaehl').forEach((n) => n.remove())
    slots.eingabe.querySelectorAll('.chatblase').forEach((n) => n.remove())
    holding = false
    calls.forEach((c) => c.kill())
    calls = []
    const step = player.step
    const index = player.index
    const flaeche = karte.buehne(index)
    // Ein Klang je Stationswechsel: der Schleifenstart meldet sich mit „hinweis“, sonst „wisch“; die erste Station nach dem Eintauchen bleibt still.
    if (!first) o.sound.play(step.loopStart ? 'hinweis' : 'wisch')
    if (first) welt.zeige()
    const erster = first
    first = false
    app.dataset.station = step.station
    app.style.setProperty('--c', `var(--c-${step.station})`)
    const ctx: SceneCtx = {
      slots: { ...slots, buehne: flaeche },
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
    safety = gsap.delayedCall(SAFETY_S + FLUG_S, () => {
      if (my === token) player.endTransition()
    })
    app.dataset.szene = 'laeuft'
    // Erst fliegt die Kamera zum Knoten, dann beginnt dort die Szene.
    karte.zeige(index, erster, () => {
      if (my !== token) return
      flaeche.replaceChildren()
      const szene = sceneFor(step.station, o.scenario.art)(ctx)
      tl = szene
      const neu = flaeche.querySelector<HTMLElement>(':scope > .stage')
      if (neu) {
        const fit = () => passeEin(neu)
        fit()
        const mo = new MutationObserver(fit)
        mo.observe(neu, { childList: true, subtree: true })
        const ro = new ResizeObserver(fit)
        ro.observe(flaeche)
        passung = () => {
          mo.disconnect()
          ro.disconnect()
        }
        const reduced = ctx.reduced
        const t = dur(reduced ? 0.15 : 0.5)
        if (t > 0) {
          einzug = gsap.fromTo(
            neu,
            reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 },
            { opacity: 1, ...(reduced ? {} : { scale: 1 }), duration: t, ease: 'power3.out', clearProps: 'transform,opacity' },
          )
        }
      }
      // Meldet das Ende der Szene (für Tests und das Kontaktblatt): data-szene=fertig, Ereignis szene-fertig.
      const fertig = () => {
        if (my !== token) return
        app.dataset.szene = 'fertig'
        pushEvent({ type: 'szene-fertig', index })
      }
      if (szene.totalDuration() === 0 || szene.progress() === 1) fertig()
      else szene.eventCallback('onComplete', fertig)
    })
  }

  const offStep = player.on('step', enter)

  // Nach 8 s im Auto-Modus meldet der Player den Zeitablauf; die Oberfläche zeigt die Wahl des Agenten.
  const offTimeout = player.on('quizTimeout', () => {
    if (holding) return
    const quiz = karte.buehne(player.index).querySelector(':scope > .stage .quiz')
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
    einzug?.kill()
    passung?.()
    slot('steuerung').removeEventListener('click', folge, true)
    karte.weg()
    welt.weg()
  }
}
