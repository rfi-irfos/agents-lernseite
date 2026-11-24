import { describe, it, expect, vi, afterEach } from 'vitest'
import { Field } from '../../src/fx/field'

function canvas(gl2: unknown, ctx2d: unknown): HTMLCanvasElement {
  return {
    width: 300,
    height: 150,
    clientWidth: 300,
    clientHeight: 150,
    getContext: (k: string) => (k === 'webgl2' ? gl2 : k === '2d' ? ctx2d : null),
  } as unknown as HTMLCanvasElement
}

describe('Field', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fällt auf 2D zurück, wenn webgl2 null liefert', () => {
    const f = new Field(canvas(null, {}))
    expect(f.mode).toBe('2d')
    f.destroy()
  })
  it('ist aus bei reduzierter Bewegung und löst sofort auf', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const f = new Field(canvas(null, {}))
    expect(f.mode).toBe('off')
    await f.dive(1000)
    await f.surface(1000)
    await f.stream({ x: 0, y: 0 } as DOMPoint, { x: 1, y: 1 } as DOMPoint, 1000)
  })
  it('wirft nie, wenn kein Kontext da ist', async () => {
    const f = new Field(canvas(null, null))
    expect(f.mode).toBe('off')
    f.setDensity(10)
    await f.dive(500)
    f.destroy()
  })
  it('wirft nie, wenn getContext selbst wirft', () => {
    const c = { ...canvas(null, null), getContext: () => { throw new Error('x') } } as unknown as HTMLCanvasElement
    expect(new Field(c).mode).toBe('off')
  })
})
