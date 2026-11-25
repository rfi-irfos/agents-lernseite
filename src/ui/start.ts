import { gsap } from 'gsap'
import { de } from '../content/de'
import { dur, reducedMotion } from '../env'
import { matchScenario } from '../engine/matcher'
import type { Scenario } from '../engine/types'
import { scenarios as beispiele } from '../scenarios'

export interface StartResult {
  scenario: Scenario
  eingabe: string
  beispiel: boolean
}

const MAX_LEN = 500
const TYPE_MS_PER_CHAR = 0.03
const TYPE_MAX_S = 1.2

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

/** Baut den Startbildschirm in die Slots von #app. Gibt eine Aufräum-Funktion zurück. */
export function mountStart(
  root: HTMLElement,
  scenarios: Scenario[],
  onStart: (r: StartResult) => void,
): () => void {
  const slot = (n: string) => root.querySelector<HTMLElement>(`[data-slot=${n}]`)
  const buehne = slot('buehne')
  const text = slot('text')
  const eingabe = slot('eingabe')
  if (!buehne || !text || !eingabe) return () => {}

  root.dataset.phase = 'start'

  const body = el('div', 'start-body')
  const h1 = el('h1')
  h1.textContent = de.start.heading
  const list = el('ul', 'start-cards')
  list.setAttribute('aria-label', de.start.cardsLabel)
  body.append(h1)
  buehne.append(body)

  // Beispiel-Aufgaben stehen wie Vorschläge unter dem Eingabefeld.
  const note = el('p', 'start-note')
  note.textContent = de.start.note
  text.append(list, note)

  const form = el('form', 'start-form')
  form.noValidate = true
  const input = el('input')
  input.type = 'text'
  input.maxLength = MAX_LEN
  input.autocomplete = 'off'
  input.placeholder = de.start.placeholder
  input.setAttribute('aria-label', de.start.inputLabel)
  const go = el('button', 'glass')
  go.type = 'submit'
  go.textContent = de.start.start
  go.disabled = true
  form.append(input, go)
  eingabe.append(form)

  let selected: { id: string; aufgabe: string } | null = null
  let typing: gsap.core.Tween | null = null
  let started = false

  const refresh = () => {
    go.disabled = started || input.value.trim() === ''
  }

  const cardButtons: HTMLButtonElement[] = []
  // Beispielkarten kommen aus den Abläufen: Kartentext = Aufgabe, eine einzige Quelle.
  for (const k of beispiele) {
    const li = el('li')
    const b = el('button', 'glass')
    b.type = 'button'
    b.dataset.card = k.id
    b.setAttribute('data-card', k.id)
    b.setAttribute('aria-pressed', 'false')
    b.textContent = k.aufgabe
    b.addEventListener('click', () => {
      if (started) return
      selected = { id: k.id, aufgabe: k.aufgabe }
      cardButtons.forEach((c) => c.setAttribute('aria-pressed', String(c === b)))
      type(k.aufgabe)
    })
    cardButtons.push(b)
    li.append(b)
    list.append(li)
  }

  /** Tipp-Animation; bei reduzierter Bewegung und im Testmodus sofort fertig. */
  function type(full: string): void {
    typing?.kill()
    const seconds = reducedMotion() ? 0 : dur(Math.min(TYPE_MAX_S, full.length * TYPE_MS_PER_CHAR))
    if (seconds <= 0) {
      input.value = full
      refresh()
      return
    }
    input.value = ''
    const o = { n: 0 }
    typing = gsap.to(o, {
      n: full.length,
      duration: seconds,
      ease: 'none',
      onUpdate: () => {
        input.value = full.slice(0, Math.round(o.n))
        refresh()
      },
      onComplete: () => {
        input.value = full
        refresh()
      },
    })
  }

  input.addEventListener('input', () => {
    typing?.kill()
    if (selected && input.value !== selected.aufgabe) {
      selected = null
      cardButtons.forEach((c) => c.setAttribute('aria-pressed', 'false'))
    }
    refresh()
  })

  form.addEventListener('submit', (ev) => {
    ev.preventDefault()
    if (started) return
    if (selected && typing?.isActive()) {
      typing.kill()
      input.value = selected.aufgabe
    }
    const eingabeText = input.value.trim()
    if (!eingabeText) return
    started = true // Sperre: genau ein Start, auch bei Doppelklick
    go.disabled = true
    input.readOnly = true
    cardButtons.forEach((c) => (c.disabled = true))
    typing?.kill()

    let r: StartResult
    if (selected && eingabeText === selected.aufgabe.trim()) {
      const direct = scenarios.find((s) => s.id === selected!.id)
      r = direct
        ? { scenario: direct, eingabe: eingabeText, beispiel: false }
        : { scenario: matchScenario(eingabeText, scenarios).scenario, eingabe: eingabeText, beispiel: false }
    } else {
      r = { ...matchScenario(eingabeText, scenarios), eingabe: eingabeText }
    }
    onStart(r)
  })

  return () => {
    typing?.kill()
    body.remove()
    list.remove()
    note.remove()
    form.remove()
  }
}
