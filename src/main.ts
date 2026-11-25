import './theme/tokens.css'
import './theme/layout.css'
import './theme/glass.css'
import './theme/start.css'
import './theme/controls.css'
import './scenes/scenes.css'
import './scenes/welt.css'
import './scenes/karte.css'
import './scenes/rueckblick/rueckblick.css'
import { de } from './content/de'
import { applyTheme, initialTheme, toggleTheme } from './theme/theme'
import { watchFormat } from './engine/format'
import { applyFormat } from './ui/layout'
import { mountStart } from './ui/start'
import { scenarios } from './scenarios'
import { readingMs } from './engine/reading-time'
import { buildSteps } from './engine/steps'
import { Player } from './engine/player'
import { Sound } from './engine/sound'
import { Field } from './fx/field'
import { dive } from './scenes/dive'
import { runScenes } from './scenes/run'
import { gsap } from 'gsap'
import { ICONS, mountControls } from './ui/controls'
import { mountProgress } from './ui/progress-bar'
import { closeDetail, openDetail } from './ui/detail'
import { markSeen, safeStore, seenScenarios } from './engine/store'
import { mountRueckblick } from './scenes/rueckblick'
import type { Player as PlayerT } from './engine/player'
import type { StartResult } from './ui/start'
import { dur, isTest, pushEvent, reducedMotion, spyAudio } from './env'
import type { SceneCtx } from './scenes/types'
import { initPwa } from './pwa'
import type { Format, Scenario, Tempo } from './engine/types'

applyTheme(initialTheme())
watchFormat(applyFormat)

const btn = document.querySelector<HTMLButtonElement>('[data-action=theme]')
if (btn) {
  btn.innerHTML = ICONS.theme
  btn.title = de.theme.toggle
  btn.setAttribute('aria-label', de.theme.toggle)
  btn.addEventListener('click', () => toggleTheme())
}
document.title = de.title

if (isTest()) window.__events ??= []

const app = document.getElementById('app')!
const slot = (n: string) => app.querySelector<HTMLElement>(`[data-slot=${n}]`)!
const fxSlot = slot('fx')
const canvas = document.createElement('canvas')
canvas.setAttribute('aria-hidden', 'true')
canvas.style.cssText = 'width:100%;height:100%;display:block'
fxSlot.append(canvas)
const field = new Field(canvas)
spyAudio()
const sound = new Sound()
sound.on = safeStore.get('sound') === 'on'

function showHint(player: Player): void {
  const hint = document.createElement('p')
  hint.className = 'start-hint'
  hint.dataset.hint = 'beispiel'
  hint.textContent = de.start.beispielHinweis
  slot('text').append(hint)
  pushEvent({ type: 'beispiel' })
  gsap.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: dur(reducedMotion() ? 0.1 : 0.5), ease: 'power2.inOut' })
  // bleibt lesbar bis zum ersten Weiterschalten
  const off = player.on('step', (p) => {
    if (p.index === 0) return
    off()
    gsap.to(hint, { opacity: 0, duration: dur(reducedMotion() ? 0.1 : 0.4), ease: 'power2.inOut', onComplete: () => hint.remove() })
  })
}

const all = [...scenarios]
if (import.meta.env.DEV && isTest() && new URLSearchParams(location.search).get('fixtures') === '1') {
  const f = await import('../tests/fixtures/scenarios')
  all.push(...f.fixtureScenarios, ...f.handelnFixtures)
}

let unmountStart: (() => void) | null = null
let session: { player: PlayerT; dispose: () => void } | null = null
let generation = 0

/** Räumt einen laufenden Ablauf vollständig ab: Szenen, Takt, Quiz, Verzögerungen, Detail-Ebene, Feld, Bühne. */
function teardown(): void {
  generation++
  void closeDetail()
  session?.dispose()
  session = null
  window.__player = undefined
  gsap.killTweensOf(slot('text').querySelectorAll('.start-hint'))
  for (const n of ['buehne', 'text', 'eingabe']) slot(n).replaceChildren()
  delete app.dataset.station
  app.style.removeProperty('--c')
  field.reset()
}

/** Startet einen Ablauf: mit Eintauchen beim ersten Mal, ohne beim „Nochmal“. */
function launch(r: StartResult, tempo: Tempo, withDive: boolean): void {
  const { scenario, eingabe, beispiel } = r
  const steps = buildSteps(scenario)
  const player = new Player(steps, { tempo })
  const gen = ++generation
  player.on('step', (p) => pushEvent({ type: 'step', index: p.index, pass: p.step.pass }))

  const detailCtx = (): SceneCtx => ({
    slots: { buehne: slot('buehne'), text: slot('text'), eingabe: slot('eingabe') },
    field,
    step: player.step,
    scenario,
    eingabe,
    format: (app.dataset.format ?? 'quer') as Format,
    reduced: reducedMotion(),
    sound,
  })

  /** Auswahl im Rückblick: derselbe Weg wie „Nächster Ablauf“ und Start, mit vollem Abräumen. */
  const pick = (next: Scenario) => {
    const t = player.tempo
    teardown()
    showStart()
    launch({ scenario: next, eingabe: next.aufgabe, beispiel: false }, t, true)
  }

  const run = () => {
    if (gen !== generation) return
    unmountStart?.()
    unmountStart = null
    void field.surface(800) // Eintauchen vorbei: die Partikel werden wieder ruhig
    if (beispiel) showHint(player)
    let stopReview: (() => void) | null = null
    const offDone = player.on('done', () => {
      if (gen !== generation) return
      markSeen(scenario.id)
      stopReview?.()
      stopReview = mountRueckblick({
        buehne: slot('buehne'),
        text: slot('text'),
        eingabe: slot('eingabe'),
        reduced: reducedMotion(),
        scenarios: all,
        seen: seenScenarios,
        onPick: pick,
        lesezeitMs: readingMs(scenario.ergebnis, player.tempo),
      })
    })
    const stopScenes = runScenes({ app, player, steps, field, scenario, eingabe, sound })
    const stopProgress = mountProgress(slot('steuerung'), steps, player)
    const stopControls = mountControls(slot('steuerung'), player, sound, {
      onDetail: () => {
        const running = !player.paused && player.state !== 'done'
        player.pause()
        void openDetail(player.step.script, detailCtx()).then(() => {
          if (running && gen === generation) player.play() // nur fortsetzen, wenn er vorher lief
        })
      },
      onRestart: () => {
        teardown()
        launch(r, player.tempo, false)
      },
      onNext: () => {
        teardown()
        showStart()
      },
    })
    session = {
      player,
      dispose: () => {
        offDone()
        stopReview?.()
        stopControls()
        stopProgress()
        stopScenes()
      },
    }
    if (isTest()) window.__player = player
    player.start()
    slot('steuerung').querySelector<HTMLElement>('[data-action=pause]')?.focus({ preventScroll: true })
  }

  if (!withDive) return run()
  const tl = dive({
    slots: { buehne: slot('buehne'), text: slot('text'), eingabe: slot('eingabe') },
    field,
    step: steps[0],
    scenario,
    eingabe,
    format: (app.dataset.format ?? 'quer') as Format,
    reduced: reducedMotion(),
    sound,
  })
  tl.eventCallback('onComplete', run)
}

function showStart(): void {
  unmountStart = mountStart(app, all, (r) => launch(r, 1, true))
  if (session === null && app.dataset.phase === 'start' && generation > 0) {
    app.querySelector<HTMLElement>('.start-form input')?.focus({ preventScroll: true })
  }
}

showStart()

initPwa()
