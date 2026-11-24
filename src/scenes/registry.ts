import type { Art, StationId } from '../engine/types'
import { orbHop, startScene } from './common'
import { denken } from './denken'
import { api } from './handeln/api'
import { bild } from './handeln/bild'
import { code } from './handeln/code'
import { planungHandeln } from './handeln/planung'
import { suche } from './handeln/suche'
import { ergebnis } from './ergebnis'
import { pruefen } from './pruefen'
import { planung } from './planung'
import { wahrnehmung } from './wahrnehmung'
import { werkzeug } from './werkzeug'
import type { SceneBuilder } from './types'

/** Rückfall für Stationen ohne eigene Szene (kommen in späteren Aufgaben): Text und kleiner Kugel-Hüpfer. */
const nurText: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  orbHop(ctx, stage, tl)
  return tl
}

const SCENES: Partial<Record<StationId, SceneBuilder>> = { wahrnehmung, denken, planung, werkzeug, pruefen, ergebnis }
const HANDELN: Record<Art, SceneBuilder> = { suche, api, code, bild, planung: planungHandeln }

/** Die Szene einer Station. `art` wählt die Variante von Handeln. */
export function sceneFor(station: StationId, art: Art): SceneBuilder {
  if (station === 'handeln') return HANDELN[art] ?? nurText
  return SCENES[station] ?? nurText
}
