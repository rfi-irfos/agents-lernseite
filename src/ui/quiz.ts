import type { Werkzeugwahl } from '../engine/types'
import { de } from '../content/de'
import { iconSvg } from '../scenes/werkzeug-icons'

export const AGENT_EVENT = 'quiz:agent'

/**
 * Mitmach-Frage: drei Karten als Knöpfe (Tab, Enter und Leertaste wählen).
 * `onPick` kommt genau einmal. Der Agent wählt per Ereignis `quiz:agent` auf dem `.quiz`-Element
 * selbst die richtige Karte und markiert sie sichtbar (`data-agent="true"`).
 */
export function mountQuiz(slot: HTMLElement, w: Werkzeugwahl, onPick: (i: 0 | 1 | 2) => void): () => void {
  const root = document.createElement('div')
  root.className = 'quiz'
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', de.stationen.mitmach)
  const frage = document.createElement('p')
  frage.className = 'quiz-frage'
  frage.textContent = w.frage
  const row = document.createElement('div')
  row.className = 'quiz-karten'
  root.append(frage, row)

  const buttons = w.karten.map((k, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'quizkarte glass'
    b.dataset.i = String(i)
    const img = document.createElement('span')
    img.className = 'werkzeug-bild'
    img.innerHTML = iconSvg(k.icon)
    const label = document.createElement('span')
    label.textContent = k.label
    b.append(img, label)
    row.append(b)
    return b
  })

  let done = false
  const settle = (i: 0 | 1 | 2) => {
    done = true
    buttons.forEach((b, j) => {
      b.setAttribute('aria-disabled', 'true')
      if (j === w.richtig) b.dataset.state = 'richtig'
      else if (j === i) b.dataset.state = 'falsch'
    })
  }
  buttons.forEach((b, i) =>
    b.addEventListener('click', () => {
      if (done) return
      settle(i as 0 | 1 | 2)
      onPick(i as 0 | 1 | 2)
    }),
  )
  root.addEventListener(AGENT_EVENT, () => {
    if (done) return
    settle(w.richtig)
    buttons[w.richtig].dataset.agent = 'true'
    root.dataset.agent = 'true'
    onPick(w.richtig)
  })

  slot.append(root)
  return () => root.remove()
}
