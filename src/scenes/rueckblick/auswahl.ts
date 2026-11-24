import { de } from '../../content/de'
import { el } from '../common'
import type { Scenario } from '../../engine/types'
import type { PartCtx, PartHandle } from './types'

const HAKEN =
  '<svg class="rb-haken" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.5 3.5L17 9"/></svg>'

/** Auswahl des nächsten Ablaufs: alle Abläufe als Karten, gesehene mit Haken. */
export function auswahl(c: PartCtx, scenarios: Scenario[], seen: string[], onPick: (s: Scenario) => void): PartHandle {
  const t = de.rueckblick.auswahl
  const list = el('ul', 'rb-karten')
  list.setAttribute('aria-label', t.label)
  let picked = false
  const first: { b?: HTMLButtonElement } = {}
  for (const s of scenarios) {
    const li = el('li')
    const b = el('button', 'glass rb-karte')
    b.type = 'button'
    b.dataset.card = s.id
    const done = seen.includes(s.id)
    if (done) b.dataset.seen = 'true'
    const name = el('span', 'rb-karte-titel')
    name.textContent = s.titel
    b.append(name)
    if (done) {
      b.insertAdjacentHTML('beforeend', HAKEN)
      const sr = el('span', 'sr-only')
      sr.textContent = t.gesehen
      b.append(sr)
    }
    b.addEventListener('click', () => {
      if (picked) return
      picked = true
      list.querySelectorAll('button').forEach((x) => x.setAttribute('aria-disabled', 'true'))
      onPick(s)
    })
    first.b ??= b
    li.append(b)
    list.append(li)
  }
  c.stage.append(list)
  const satz = el('p', 'rb-satz')
  satz.textContent = t.titel
  c.text.append(satz)
  return { kill: () => {}, focus: () => first.b?.focus({ preventScroll: true }) }
}
