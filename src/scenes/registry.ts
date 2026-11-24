import type { Art, StationId } from '../engine/types'
import { orbHop, startScene } from './common'
import { denken } from './denken'
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

const SCENES: Partial<Record<StationId, SceneBuilder>> = { wahrnehmung, denken, planung, werkzeug }

/** Die Szene einer Station. `art` ist für die Handeln-Szenen später wichtig. */
export function sceneFor(station: StationId, art: Art): SceneBuilder {
  void art
  return SCENES[station] ?? nurText
}
