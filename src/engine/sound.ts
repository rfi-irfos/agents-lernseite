export type SfxName = 'klick' | 'wisch' | 'eintauchen' | 'auftauchen' | 'richtig' | 'hinweis'

export class Sound {
  on = false

  toggle(): boolean {
    this.on = !this.on
    return this.on
  }

  play(name: SfxName): void {
    if (!this.on) return
    try {
      const a = new Audio(`/sfx/${name}.ogg`)
      a.volume = 0.4
      void Promise.resolve(a.play()).catch(() => {})
    } catch {
      /* fehlende Datei oder kein Audio: stumm weiter */
    }
  }
}
