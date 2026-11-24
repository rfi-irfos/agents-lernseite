import type { gsap } from 'gsap'
import type { Field } from '../fx/field'
import type { Step } from '../engine/steps'
import type { Scenario, Format } from '../engine/types'
import type { Sound } from '../engine/sound'

export interface QuizCtl {
  /** Bei der Mitmach-Frage: Zeit anhalten, solange die Rückmeldung zu sehen ist. */
  hold(): void
  /** Nur bei einem Tipp des Nutzers: eine Pause aufheben, damit der Klick nicht verloren geht. */
  resume(): void
  /** Antwort an den Player geben. Eine Pause bleibt bestehen, die Antwort wartet auf Weiter. */
  answer(i: 0 | 1 | 2): void
  /** Verzögerter Aufruf, der beim Verlassen der Station verfällt. */
  later(seconds: number, fn: () => void): void
}

export interface SceneCtx {
  slots: Record<'buehne' | 'text' | 'eingabe', HTMLElement>
  field: Field
  step: Step
  scenario: Scenario
  eingabe: string
  format: Format
  reduced: boolean
  sound: Sound
  /** Nur im laufenden Ablauf: Mitmach-Frage. */
  quiz?: QuizCtl
  /** Wird gerufen, sobald der Text steht; dann zählt die Lesezeit. */
  textReady?: () => void
}

export type SceneBuilder = (ctx: SceneCtx) => ReturnType<typeof gsap.timeline>
