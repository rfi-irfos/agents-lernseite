import { describe, it, expect, vi, afterEach } from 'vitest'
import { Sound } from '../../src/engine/sound'

describe('Sound', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Standard aus, toggle schaltet', () => {
    const s = new Sound()
    expect(s.on).toBe(false)
    expect(s.toggle()).toBe(true)
    expect(s.on).toBe(true)
  })
  it('spielt nichts, solange aus', () => {
    const ctor = vi.fn()
    vi.stubGlobal('Audio', ctor)
    new Sound().play('klick')
    expect(ctor).not.toHaveBeenCalled()
  })
  it('wirft nie, wenn play() ablehnt', async () => {
    const play = vi.fn(() => Promise.reject(new Error('404')))
    vi.stubGlobal('Audio', function (this: unknown) { return { play, volume: 1 } } as unknown)
    const s = new Sound()
    s.toggle()
    expect(() => s.play('klick')).not.toThrow()
    await Promise.resolve()
    expect(play).toHaveBeenCalled()
  })
  it('wirft nie, wenn play() synchron wirft oder Audio fehlt', () => {
    const s = new Sound()
    s.toggle()
    expect(() => s.play('wisch')).not.toThrow()
    vi.stubGlobal('Audio', function () { throw new Error('x') } as unknown)
    expect(() => s.play('wisch')).not.toThrow()
  })

  describe('Pool (iOS-Entsperrung)', () => {
    function fakeAudio() {
      const made: { src: string; muted: boolean; volume: number; currentTime: number; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> }[] = []
      vi.stubGlobal('Audio', function (this: unknown, src: string) {
        const a = { src, muted: false, volume: 1, currentTime: 0, play: vi.fn(() => Promise.resolve()), pause: vi.fn() }
        made.push(a)
        return a
      } as unknown)
      return made
    }
    it('solange aus: kein Audio-Objekt, auch nicht bei play', () => {
      const made = fakeAudio()
      const s = new Sound()
      s.play('klick')
      expect(made).toHaveLength(0)
    })
    it('Einschalten legt genau sechs Elemente an und entsperrt jedes stumm', async () => {
      const made = fakeAudio()
      const s = new Sound()
      let mutedAtPlay = true
      s.toggle()
      expect(made).toHaveLength(6)
      for (const a of made) {
        expect(a.play).toHaveBeenCalledTimes(1)
        mutedAtPlay = mutedAtPlay && a.muted
      }
      expect(mutedAtPlay).toBe(true)
      await Promise.resolve(); await Promise.resolve()
      for (const a of made) {
        expect(a.pause).toHaveBeenCalled()
        expect(a.muted).toBe(false)
      }
      s.toggle(); s.toggle() // aus und wieder an: kein zweiter Pool
      expect(made).toHaveLength(6)
    })
    it('play nutzt den Pool: kein neues Objekt, Zurücksetzen, Lautstärke, Wiedergabe', async () => {
      const made = fakeAudio()
      const s = new Sound()
      s.toggle()
      await Promise.resolve(); await Promise.resolve()
      const klick = made.find((a) => a.src.endsWith('/klick.ogg'))!
      klick.play.mockClear(); klick.pause.mockClear(); klick.currentTime = 1.5
      s.play('klick')
      expect(made).toHaveLength(6)
      expect(klick.pause).toHaveBeenCalled()
      expect(klick.currentTime).toBe(0)
      expect(klick.volume).toBe(0.4)
      expect(klick.play).toHaveBeenCalledTimes(1)
    })
    it('Klick direkt nach dem Einschalten wird nicht vom späten Entsperren pausiert', async () => {
      const made = fakeAudio()
      const s = new Sound()
      s.toggle()
      s.play('klick')
      const klick = made.find((a) => a.src.endsWith('/klick.ogg'))!
      klick.pause.mockClear()
      await Promise.resolve(); await Promise.resolve()
      expect(klick.pause).not.toHaveBeenCalled()
      expect(klick.muted).toBe(false)
    })
  })
})
