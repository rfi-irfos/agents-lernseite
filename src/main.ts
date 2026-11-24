import './theme/tokens.css'
import './theme/layout.css'
import './theme/glass.css'
import './theme/start.css'
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
import { isTest, pushEvent, reducedMotion } from './env'
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

const unmount = mountStart(app, scenarios, ({ scenario, eingabe, beispiel }) => {
  const steps = buildSteps(scenario)
  const player = new Player(steps)
  player.on('step', (p) => pushEvent({ type: 'step', index: p.index }))
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
  void beispiel
  tl.eventCallback('onComplete', () => {
    unmount()
    player.start()
  })
})
