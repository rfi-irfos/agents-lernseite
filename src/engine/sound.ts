export type SfxName = 'klick' | 'wisch' | 'eintauchen' | 'auftauchen' | 'richtig' | 'hinweis'

const NAMES: SfxName[] = ['klick', 'wisch', 'eintauchen', 'auftauchen', 'richtig', 'hinweis']

export class Sound {
  on = false
  /** Pool: sechs Audio-Elemente, einmal im Klick des Schalters angelegt und freigeschaltet (iOS). */
  private pool = new Map<SfxName, HTMLAudioElement>()
  /** Effekte, die schon echt gespielt wurden: ein spät fertiges Entsperren pausiert sie nie. */
  private used = new Set<SfxName>()

  /** Schaltet um. Beim Einschalten (im Klick des Nutzers) entsteht der Pool und wird für iOS entsperrt. */
  toggle(): boolean {
    this.on = !this.on
    if (this.on) this.unlock()
    return this.on
  }

  /** Legt den Pool einmal an und spielt jedes Element stumm kurz an, damit iOS spätere Wiedergaben erlaubt. */
  private unlock(): void {
    if (this.pool.size > 0) return
    for (const n of NAMES) {
      try {
        const a = new Audio(`/sfx/${n}.ogg`)
        this.pool.set(n, a)
        a.muted = true
        void Promise.resolve(a.play())
          .then(() => {
            if (this.used.has(n)) return
            a.pause()
            a.currentTime = 0
            a.muted = false
          })
          .catch(() => {
            if (!this.used.has(n)) a.muted = false
          })
      } catch {
        /* kein Audio: stumm weiter */
      }
    }
  }

  play(name: SfxName): void {
    if (!this.on) return
    try {
      if (this.pool.size === 0) this.unlock() // Zustand stammt aus dem Speicher, kein Klick davor
      const a = this.pool.get(name)
      if (!a) return
      this.used.add(name)
      // Derselbe Effekt stapelt sich nie: ein noch laufender wird zurückgesetzt (schnelles Überspringen).
      try { a.pause() } catch { /* ignorieren */ }
      try { a.currentTime = 0 } catch { /* ignorieren */ }
      a.muted = false
      a.volume = 0.4
      void Promise.resolve(a.play()).catch(() => {})
    } catch {
      /* fehlende Datei oder kein Audio: stumm weiter */
    }
  }
}
