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
})
