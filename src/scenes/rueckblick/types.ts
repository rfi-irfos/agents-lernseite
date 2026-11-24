export interface PartCtx {
  stage: HTMLElement
  text: HTMLElement
  reduced: boolean
  /** Dauer in Sekunden: im Testmodus 0, bei reduzierter Bewegung höchstens 0,2 s. */
  d: (seconds: number) => number
  /** Nur Teile mit Folgeteil: Knopf „Weiter“ wird angezeigt. */
  weiter?: () => void
}

export interface PartHandle {
  /** Stoppt alle Animationen des Teils. */
  kill: () => void
  /** Erstes bedienbares Element, wenn der Fokus dorthin soll. */
  focus?: () => void
}
