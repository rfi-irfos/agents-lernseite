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

  it('rechnet Strom-Punkte in CSS-Pixeln, auch bei devicePixelRatio 2', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const c = { ...canvas(null, {}), width: 600, height: 300 } as unknown as HTMLCanvasElement
    const f = new Field(c)
    void f.stream({ x: 150, y: 75 } as DOMPoint, { x: 150, y: 75 } as DOMPoint, 1000)
    const pts = (f as unknown as { points(): { x: number; y: number }[] }).points()
    const last = pts[pts.length - 1]
    expect(last.x).toBeCloseTo(0, 5) // 150 von 300 CSS-Pixeln = Mitte
    expect(last.y).toBeCloseTo(0, 5)
    f.destroy()
  })
  it('reset beruhigt Tiefenflug und Ströme', () => {
    const f = new Field(canvas(null, {}))
    void f.dive(1000)
    void f.stream({ x: 0, y: 0 } as DOMPoint, { x: 1, y: 1 } as DOMPoint, 1000)
    f.reset()
    const st = f as unknown as { boost: number; boostTarget: number; streams: unknown[] }
    expect([st.boost, st.boostTarget, st.streams.length]).toEqual([0, 0, 0])
    f.destroy()
  })

  describe('WebGL-Kontextverlust', () => {
    function fakeGl(linkOk: () => boolean) {
      const calls = { clear: 0, program: 0 }
      const gl = {
        VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, BLEND: 5, ONE: 6, ONE_MINUS_SRC_ALPHA: 7,
        COLOR_BUFFER_BIT: 8, ARRAY_BUFFER: 9, DYNAMIC_DRAW: 10, FLOAT: 11, POINTS: 12,
        createShader: () => ({}), shaderSource() {}, compileShader() {}, getShaderParameter: () => true,
        createProgram: () => (calls.program++, {}), attachShader() {}, linkProgram() {}, getProgramParameter: () => linkOk(),
        createBuffer: () => ({}), enable() {}, blendFunc() {}, viewport() {},
        clearColor() {}, clear: () => void calls.clear++, useProgram() {}, bindBuffer() {}, bufferData() {},
        getAttribLocation: () => 0, enableVertexAttribArray() {}, vertexAttribPointer() {},
        getUniformLocation: () => ({}), uniform1f() {}, uniform3f() {}, drawArrays() {},
      }
      return { gl, calls }
    }
    function evCanvas(gl: unknown) {
      const h: Record<string, (e: Event) => void> = {}
      const c = { ...canvas(gl, null), addEventListener: (n: string, f: (e: Event) => void) => void (h[n] = f), removeEventListener: (n: string) => void delete h[n] }
      return { c: c as unknown as HTMLCanvasElement, h }
    }
    const draw = (f: Field) => (f as unknown as { draw(): void }).draw()

    it('verhindert den Standard, zeichnet währenddessen nicht und baut nach der Rückkehr neu auf', () => {
      const { gl, calls } = fakeGl(() => true)
      const { c, h } = evCanvas(gl)
      const f = new Field(c)
      expect(f.mode).toBe('webgl2')
      expect(calls.program).toBe(1)
      const ev = { preventDefault: vi.fn() } as unknown as Event
      h.webglcontextlost(ev)
      expect(ev.preventDefault).toHaveBeenCalled()
      calls.clear = 0
      draw(f)
      expect(calls.clear).toBe(0)
      h.webglcontextrestored({} as Event)
      expect(calls.program).toBe(2)
      expect(f.mode).toBe('webgl2')
      draw(f)
      expect(calls.clear).toBe(1)
      f.destroy()
      expect(h.webglcontextlost).toBeUndefined()
    })
    it('schlägt der Neuaufbau fehl, bleibt das Feld still statt zu werfen', () => {
      let ok = true
      const { gl } = fakeGl(() => ok)
      const { c, h } = evCanvas(gl)
      const f = new Field(c)
      h.webglcontextlost({ preventDefault() {} } as unknown as Event)
      ok = false
      h.webglcontextrestored({} as Event)
      expect(f.mode).toBe('off')
      expect(() => draw(f)).not.toThrow()
      f.destroy()
    })
  })
})
