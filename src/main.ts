import './theme/tokens.css'
import './theme/layout.css'
import './theme/glass.css'
import './theme/start.css'
import './scenes/scenes.css'
import { de } from './content/de'
import { applyTheme, initialTheme, toggleTheme } from './theme/theme'
import { watchFormat } from './engine/format'
import { applyFormat } from './ui/layout'
import { mountStart } from './ui/start'
import { scenarios } from './scenarios'
import { buildSteps } from './engine/steps'
import { Player } from './engine/player'
import { Sound } from './engine/sound'
import { Field } from './fx/field'
import { dive } from './scenes/dive'
import { runScenes } from './scenes/run'
import { gsap } from 'gsap'
import { dur, isTest, pushEvent, reducedMotion } from './env'
import type { Format } from './engine/types'

applyTheme(initialTheme())
watchFormat(applyFormat)

const btn = document.querySelector<HTMLButtonElement>('[data-action=theme]')
if (btn) {
  btn.textContent = de.theme.toggle
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
const sound = new Sound()

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

const unmount = mountStart(app, all, ({ scenario, eingabe, beispiel }) => {
  const steps = buildSteps(scenario)
  const player = new Player(steps)
  player.on('step', (p) => pushEvent({ type: 'step', index: p.index, pass: p.step.pass }))
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
  tl.eventCallback('onComplete', () => {
    unmount()
    void field.surface(800) // Eintauchen vorbei: die Partikel werden wieder ruhig
    if (beispiel) showHint(player)
    runScenes({ app, player, field, scenario, eingabe, sound })
    if (isTest()) window.__player = player
    player.start()
  })
})
