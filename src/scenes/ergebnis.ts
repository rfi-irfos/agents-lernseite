import { gsap } from 'gsap'
import { de } from '../content/de'
import { pushEvent } from '../env'
import { d, el, startScene, streamBetween, svgBox, tv } from './common'
import { svgRaw } from './svg'
import type { SceneBuilder } from './types'

/**
 * Chat-Blase: die Antwort erscheint dort, wo die Frage stand (am Platz des Eingabefelds, gemessen am Layout-Slot),
 * danach taucht die Kamera wieder auf (`field.surface`).
 */
export const ergebnis: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const fertig = el('div', 'fertig')
  fertig.append(svgBox(svgRaw('haken'), 'fertig-haken'))
  const label = el('span')
  label.textContent = de.stationen.fertig
  fertig.append(label)
  stage.append(fertig)

  const slot = ctx.slots.eingabe
  slot.querySelectorAll('.chatblase').forEach((n) => n.remove())
  const blase = el('div', 'chatblase')
  blase.setAttribute('role', 'status')
  blase.setAttribute('aria-label', de.stationen.antwortDesAgenten)
  const name = el('span', 'chat-name')
  name.textContent = de.stationen.agent
  const antwort = el('p', 'chat-text')
  antwort.textContent = ctx.scenario.ergebnis
  blase.append(name, antwort)
  slot.append(blase)
  // Ragt die Blase unten aus dem Bild oder in die Steuerung (kleines Telefon), rückt sie nur so weit hoch, wie nötig.
  const app = slot.closest('#app') as HTMLElement | null
  if (app) {
    const steuerung = app.querySelector('[data-slot=steuerung]')
    const limit = Math.min(app.getBoundingClientRect().bottom, steuerung ? steuerung.getBoundingClientRect().top : Infinity) - 4
    const over = blase.getBoundingClientRect().bottom - limit
    if (over > 0) blase.style.top = `-${Math.ceil(over)}px`
  }
  gsap.set(blase, { opacity: 0 })
  gsap.set(fertig, { opacity: 0 })

  tl.to(fertig, { opacity: 1, duration: d(ctx, 0.4) }, 'handlung')
  tl.call(() => streamBetween(ctx, fertig, blase, 600))
  tl.fromTo(
    blase,
    tv(ctx, { opacity: 0, y: 16, scale: 0.96, transformOrigin: '0% 0%' }),
    tv(ctx, { opacity: 1, y: 0, scale: 1, duration: d(ctx, 0.5), clearProps: 'transform' }),
    `+=${d(ctx, 0.2)}`,
  )
  tl.call(() => {
    pushEvent({ type: 'auftauchen' })
    void ctx.field.surface(d(ctx, 0.8) * 1000)
  })
  return tl
}
