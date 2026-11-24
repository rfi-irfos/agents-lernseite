export type SfxName = 'klick' | 'wisch' | 'eintauchen' | 'auftauchen' | 'richtig' | 'hinweis'

export class Sound {
  on = false
  private last = new Map<SfxName, HTMLAudioElement>()

  toggle(): boolean {
    this.on = !this.on
    return this.on
  }

  play(name: SfxName): void {
    if (!this.on) return
    try {
      // Derselbe Effekt stapelt sich nie: ein noch laufender wird vorher beendet (schnelles Überspringen).
      try { this.last.get(name)?.pause() } catch { /* ignorieren */ }
      const a = new Audio(`/sfx/${name}.ogg`)
      this.last.set(name, a)
      a.volume = 0.4
      void Promise.resolve(a.play()).catch(() => {})
    } catch {
      /* fehlende Datei oder kein Audio: stumm weiter */
    }
  }
}
