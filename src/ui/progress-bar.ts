import { de } from '../content/de'
import type { Player } from '../engine/player'
import type { Step } from '../engine/steps'

/**
 * Fortschrittsleiste: ein Punkt pro Schritt (Knopf, per Tab erreichbar). Kurze Schritte haben einen kleineren Punkt,
 * ein Klick auf einen Punkt ruft `goTo` auf. Gibt eine Aufräum-Funktion zurück.
 */
export function mountProgress(slot: HTMLElement, steps: Step[], p: Player): () => void {
  const nav = document.createElement('div')
  nav.className = 'progress'
  nav.setAttribute('role', 'group')
  nav.setAttribute('aria-label', de.fortschritt.label)

  const dots = steps.map((st, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'progress-dot'
    b.dataset.dot = String(i)
    b.style.setProperty('--dc', `var(--c-${st.station})`)
    b.setAttribute('aria-label', `${de.fortschritt.schritt} ${i + 1} ${de.fortschritt.von} ${steps.length}: ${de.stationNamen[st.station]}`)
    const dot = document.createElement('span')
    dot.className = 'dot'
    dot.setAttribute('aria-hidden', 'true')
    b.append(dot)
    b.addEventListener('click', () => {
      if (i !== p.index) p.goTo(i)
    })
    nav.append(b)
    return b
  })

  const render = () => {
    const done = p.state === 'done'
    dots.forEach((b, i) => {
      b.dataset.state = done || i < p.index ? 'done' : i === p.index ? 'now' : 'todo'
      if (i === p.index) b.setAttribute('aria-current', 'step')
      else b.removeAttribute('aria-current')
    })
  }
  render()
  const offs = [p.on('step', render), p.on('state', render)]
  slot.append(nav)
  return () => {
    offs.forEach((f) => f())
    nav.remove()
  }
}
