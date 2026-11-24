import { de } from '../content/de'
import type { Player } from '../engine/player'
import type { Sound } from '../engine/sound'
import { safeStore } from '../engine/store'
import type { Tempo } from '../engine/types'
import { isDetailOpen } from './detail'

const TEMPI: Tempo[] = [0.75, 1, 1.5]
const tempoText = (t: Tempo) => `${String(t).replace('.', ',')}×`

const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`

/** Zweifarbig: Grundform in Schriftfarbe, Akzent in der Fokusfarbe (siehe controls.css). */
export const ICONS = {
  back: svg('<path d="M16 6 10 12l6 6"/><path class="acc" d="M6 6v12"/>'),
  next: svg('<path d="M8 6l6 6-6 6"/><path class="acc" d="M18 6v12"/>'),
  pause: svg('<path d="M9 6v12"/><path class="acc" d="M15 6v12"/>'),
  play: svg('<path d="M8 5.5v13l11-6.5z"/>'),
  sound: svg('<path d="M4 9.5h3l4-3.5v12l-4-3.5H4z"/><path class="acc on" d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11"/><path class="acc off" d="M15 9.5l5 5M20 9.5l-5 5"/>'),
  theme: svg('<circle cx="12" cy="12" r="8"/><path class="acc fill" d="M12 4a8 8 0 0 1 0 16z"/>'),
  tiefer: svg('<path d="M5 19h14"/><path class="acc" d="M12 4v10M8 11l4 4 4-4"/>'),
  nochmal: svg('<path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7"/><path class="acc" d="M19.5 4.5v4.5H15"/>'),
  naechster: svg('<path d="M5 12h11"/><path class="acc" d="M12 7l5 5-5 5"/>'),
  close: svg('<path d="M6 6l12 12"/><path class="acc" d="M18 6L6 18"/>'),
} as const

export interface ControlHandlers {
  /** „Tiefer graben“ wurde gedrückt. */
  onDetail?: () => void
  /** „Nochmal“: derselbe Ablauf von vorn. */
  onRestart?: () => void
  /** „Nächster Ablauf“: zurück zum Startbildschirm. */
  onNext?: () => void
}

function button(action: string, icon: string, label: string, text?: string): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'glass ctl'
  b.dataset.action = action
  b.title = label
  b.setAttribute('aria-label', label)
  b.innerHTML = icon
  if (text !== undefined) {
    const t = document.createElement('span')
    t.className = 'ctl-text'
    t.textContent = text
    b.append(t)
  }
  return b
}

/** Schaltet einen Knopf ab, ohne ihn aus der Tab-Reihenfolge zu nehmen (der Fokus geht nie verloren). */
const setDisabled = (b: HTMLElement, off: boolean) => {
  if (off) b.setAttribute('aria-disabled', 'true')
  else b.removeAttribute('aria-disabled')
}

/**
 * Steuerleiste: Zurück, Pause/Weiter, Vor, Tempo, Tiefer graben, Ton, Thema; am Ende „Nochmal“ und „Nächster Ablauf“.
 * Der Themenschalter ([data-action=theme]) steht schon auf dem Startbildschirm im Slot und zieht hierher um.
 * Tastatur: Leertaste = Pause/Weiter, ← → = Schritt. Gibt eine Aufräum-Funktion zurück.
 */
export function mountControls(slot: HTMLElement, p: Player, s: Sound, h: ControlHandlers = {}): () => void {
  const bar = document.createElement('div')
  bar.className = 'controls'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', de.steuerung.label)

  const main = document.createElement('div')
  main.className = 'controls-main'
  const done = document.createElement('div')
  done.className = 'controls-done'
  const aux = document.createElement('div')
  aux.className = 'controls-aux'
  const stack = document.createElement('div')
  stack.className = 'controls-stack'

  const back = button('back', ICONS.back, de.steuerung.zurueck)
  const pause = button('pause', ICONS.pause, de.steuerung.pause)
  const next = button('next', ICONS.next, de.steuerung.vor)
  const tempo = button('tempo', '', de.steuerung.tempo, '')
  const tiefer = button('tiefer', ICONS.tiefer, de.steuerung.tiefer, de.steuerung.tiefer)
  tiefer.classList.add('ctl-wide')
  const sound = button('sound', ICONS.sound, de.steuerung.ton)
  const nochmal = button('nochmal', ICONS.nochmal, de.steuerung.nochmal, de.steuerung.nochmal)
  const naechster = button('weiter-ablauf', ICONS.naechster, de.steuerung.naechster, de.steuerung.naechster)
  nochmal.classList.add('ctl-wide')
  naechster.classList.add('ctl-wide')

  // Der Themenschalter wird nicht neu gebaut, sondern umgezogen (genau ein Knopf, gleiche Handler).
  const found = document.querySelector<HTMLElement>('[data-action=theme]')
  const theme = found ?? button('theme', ICONS.theme, de.theme.toggle)
  const themeHome = found?.parentElement ?? slot

  main.append(back, pause, next, tempo, tiefer)
  done.append(nochmal, naechster)
  aux.append(sound, theme)
  stack.append(main, done)
  bar.append(stack, aux)
  slot.append(bar)

  const render = () => {
    const finished = p.state === 'done'
    const paused = p.paused
    bar.dataset.done = String(finished)
    pause.setAttribute('aria-label', paused ? de.steuerung.weiter : de.steuerung.pause)
    pause.title = pause.getAttribute('aria-label')!
    pause.innerHTML = paused ? ICONS.play : ICONS.pause
    setDisabled(pause, finished)
    setDisabled(back, finished || p.index === 0)
    setDisabled(next, finished)
    setDisabled(tiefer, finished || !p.step.script.tiefer?.length)
    const t = tempoText(p.tempo)
    tempo.querySelector('.ctl-text')!.textContent = t
    tempo.setAttribute('aria-label', `${de.steuerung.tempo}: ${t}`)
    tempo.title = tempo.getAttribute('aria-label')!
    sound.setAttribute('aria-pressed', String(s.on))
    if (finished && main.contains(document.activeElement)) nochmal.focus({ preventScroll: true })
  }

  /** Klick mit leisem Effekt; abgeschaltete Knöpfe tun nichts. */
  const on = (b: HTMLElement, fn: () => void) =>
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return
      s.play('klick')
      fn()
      render()
    })

  const togglePause = () => (p.paused ? p.play() : p.pause())
  on(back, () => p.prev())
  on(next, () => p.next())
  on(pause, togglePause)
  on(tempo, () => p.setTempo(TEMPI[(TEMPI.indexOf(p.tempo) + 1) % TEMPI.length]))
  on(tiefer, () => h.onDetail?.())
  on(sound, () => {
    safeStore.set('sound', s.toggle() ? 'on' : 'off')
  })
  on(nochmal, () => h.onRestart?.())
  on(naechster, () => h.onNext?.())

  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
    if (isDetailOpen()) return // die Detail-Ebene hat ihre eigene Tastatur
    const t = e.target instanceof Element ? e.target : null
    if (t?.closest('input, textarea, select, [contenteditable]')) return
    if (e.key === ' ' || e.code === 'Space') {
      if (t?.closest('.quiz')) return // Quizkarte: die Taste wählt die Karte
      if (t?.closest('button, a, [role=button]')) return // Knopf mit Fokus: seine eigene Taste, nicht doppelt
      e.preventDefault()
      if (p.state !== 'done') {
        togglePause()
        render()
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      if (p.state === 'done') return
      if (e.key === 'ArrowRight') p.next()
      else p.prev()
      render()
    }
  }
  document.addEventListener('keydown', onKey)

  render()
  const offs = [p.on('state', render), p.on('step', render)]
  return () => {
    offs.forEach((f) => f())
    document.removeEventListener('keydown', onKey)
    // der Themenschalter geht zurück in den Slot
    if (found) themeHome.append(found)
    bar.remove()
  }
}
