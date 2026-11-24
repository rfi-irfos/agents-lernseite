import type { Tempo } from './types'
import type { Step } from './steps'
import { readingMs } from './reading-time'

export type PlayerState = 'idle' | 'playing' | 'paused' | 'quiz' | 'transition' | 'done'
type Ev = 'step' | 'quiz' | 'done' | 'state'
type Nav = { kind: 'next' } | { kind: 'prev' } | { kind: 'goTo'; i: number }

const SHORT_MAX_MS = 2000
export const QUIZ_TIMEOUT_MS = 8000

/** Zustandsmaschine ohne DOM und ohne Timer. Zeit kommt nur über tick(). */
export class Player {
  private _state: PlayerState = 'idle'
  private _index = 0
  private auto: boolean
  private tempo: Tempo
  private progress = 0 // Anteil der Haltezeit, 0..1
  private quizMs = 0
  private resumeState: PlayerState = 'playing'
  private queued: Nav | null = null
  private listeners: Record<Ev, Set<(p: Player) => void>> = {
    step: new Set(), quiz: new Set(), done: new Set(), state: new Set(),
  }

  constructor(private readonly steps: Step[], opts: { auto?: boolean; tempo?: Tempo } = {}) {
    this.auto = opts.auto ?? true
    this.tempo = opts.tempo ?? 1
  }

  get state(): PlayerState { return this._state }
  get index(): number { return this._index }
  get step(): Step { return this.steps[this._index] }

  on(ev: Ev, cb: (p: Player) => void): () => void {
    this.listeners[ev].add(cb)
    return () => { this.listeners[ev].delete(cb) }
  }

  start(): void {
    if (this._state !== 'idle') return
    this.enter(0)
  }

  play(): void {
    if (this._state === 'idle') return this.start()
    if (this._state !== 'paused') return
    this.setState(this.resumeState)
  }

  pause(): void {
    if (this._state !== 'playing' && this._state !== 'quiz') return
    this.resumeState = this._state
    this.setState('paused')
  }

  next(): void { this.nav({ kind: 'next' }) }
  prev(): void { this.nav({ kind: 'prev' }) }
  goTo(i: number): void { this.nav({ kind: 'goTo', i }) }

  setTempo(t: Tempo): void { this.tempo = t } // progress ist ein Anteil, wirkt also anteilig
  setAuto(a: boolean): void { this.auto = a }

  answerQuiz(i: 0 | 1 | 2): { richtig: boolean; erklaerung?: string } {
    const w = this._state === 'quiz' ? this.step.script.werkzeug : undefined
    if (!w) return { richtig: false }
    const richtig = i === w.richtig
    this.advance()
    return richtig ? { richtig } : { richtig, erklaerung: w.erklaerung }
  }

  beginTransition(): void {
    if (this._state !== 'playing' && this._state !== 'quiz') return
    this.resumeState = this._state
    this.setState('transition')
  }

  endTransition(): void {
    if (this._state !== 'transition') return
    this.setState(this.resumeState)
    const q = this.queued
    this.queued = null
    if (q) this.run(q)
  }

  tick(ms: number): void {
    if (!this.auto || ms <= 0) return
    if (this._state === 'playing') {
      const hold = this.holdMs()
      this.progress += hold > 0 ? ms / hold : 1
      if (this.progress >= 1) this.advance()
    } else if (this._state === 'quiz') {
      this.quizMs += ms
      if (this.quizMs >= QUIZ_TIMEOUT_MS) {
        const w = this.step.script.werkzeug
        if (w) this.answerQuiz(w.richtig)
      }
    }
  }

  private holdMs(): number {
    const ms = readingMs(this.step.script.text, this.tempo)
    return this.step.script.kurz ? Math.min(ms, SHORT_MAX_MS) : ms
  }

  private nav(n: Nav): void {
    if (this._state === 'transition') { this.queued = n; return }
    if (this._state === 'done') return
    this.run(n)
  }

  private run(n: Nav): void {
    if (n.kind === 'next') this.advance()
    else if (n.kind === 'prev') this.enter(Math.max(0, this._index - 1))
    else this.enter(Math.min(Math.max(0, n.i), this.steps.length - 1))
  }

  private advance(): void {
    if (this._index >= this.steps.length - 1) {
      this.setState('done')
      this.emit('done')
    } else this.enter(this._index + 1)
  }

  private enter(i: number): void {
    this._index = i
    this.progress = 0
    this.quizMs = 0
    const quiz = !!this.step.script.werkzeug
    this.setState(quiz ? 'quiz' : 'playing')
    this.emit('step')
    if (quiz) this.emit('quiz')
  }

  private setState(s: PlayerState): void {
    if (s === this._state) return
    this._state = s
    this.emit('state')
  }

  private emit(ev: Ev): void {
    for (const cb of [...this.listeners[ev]]) cb(this)
  }
}
