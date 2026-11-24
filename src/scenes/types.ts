import type { gsap } from 'gsap'
import type { Field } from '../fx/field'
import type { Step } from '../engine/steps'
import type { Scenario, Format } from '../engine/types'
import type { Sound } from '../engine/sound'

export interface SceneCtx {
  slots: Record<'buehne' | 'text' | 'eingabe', HTMLElement>
  field: Field
  step: Step
  scenario: Scenario
  eingabe: string
  format: Format
  reduced: boolean
  sound: Sound
}

export type SceneBuilder = (ctx: SceneCtx) => ReturnType<typeof gsap.timeline>
