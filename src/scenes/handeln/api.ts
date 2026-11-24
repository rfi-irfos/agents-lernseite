import { de } from '../../content/de'
import { parseHandelnDaten } from '../../engine/handeln'
import { d, el, orbHop, startScene, streamBetween, tv } from '../common'
import type { SceneBuilder } from '../types'

function karte(cls: string, label: string, text: string): HTMLElement {
  const k = el('div', cls)
  const l = el('span', 'karte-label')
  l.textContent = label
  const t = el('span', 'karte-text')
  t.textContent = text
  k.append(l, t)
  return k
}

/** Anfrage und Antwort: eine Karte geht hinaus, die Antwortkarte kommt zurück. */
export const api: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const daten = parseHandelnDaten('api', ctx.step.script.daten)
  if (!daten) {
    orbHop(ctx, stage, tl)
    return tl
  }
  const row = el('div', 'api')
  const frage = karte('anfragekarte', de.stationen.anfrage, daten.anfrage)
  const antwort = karte('antwortkarte', de.stationen.antwort, daten.antwort)
  row.append(frage, antwort)
  stage.append(row)
  tl.fromTo(frage, tv(ctx, { opacity: 0, x: -60 }), tv(ctx, { opacity: 1, x: 0, duration: d(ctx, 0.5), clearProps: 'transform' }), 'handlung')
  tl.call(() => streamBetween(ctx, frage, antwort, 700))
  tl.fromTo(antwort, tv(ctx, { opacity: 0, x: 60 }), tv(ctx, { opacity: 1, x: 0, duration: d(ctx, 0.5), clearProps: 'transform' }), `+=${d(ctx, 0.5)}`)
  return tl
}
