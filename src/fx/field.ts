type Mode = 'webgl2' | '2d' | 'off'
type Pt = { x: number; y: number }

interface P { x: number; y: number; z: number; a: number }

const MAX = 400
const VS = `#version 300 es
in vec3 p; uniform float uPx;
void main(){ gl_Position = vec4(p.xy, 0.0, 1.0); gl_PointSize = uPx * (0.5 + p.z); }`
const FS = `#version 300 es
precision mediump float; uniform vec3 uC; uniform float uA; out vec4 o;
void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.0, 1.0, d)) * uA; o = vec4(uC * a, a); }`

function reduced(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Weiches Partikelfeld. WebGL2, Rückfall Canvas 2D, bei reduzierter Bewegung aus. Wirft nie. */
export class Field {
  mode: Mode = 'off'
  private parts: P[] = []
  private gl: WebGL2RenderingContext | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private prog: WebGLProgram | null = null
  private buf: WebGLBuffer | null = null
  private data = new Float32Array(MAX * 3)
  private boost = 0 // 0 ruhig, 1 Tiefenflug
  private boostTarget = 0
  private streams: { a: Pt; b: Pt; t: number; ms: number }[] = []
  private raf = 0
  private last = 0
  private ro: ResizeObserver | undefined
  private glLost = false
  private onLost = (e: Event) => {
    e.preventDefault() // ohne das kommt kein „restored“
    this.glLost = true
  }
  private onRestored = () => {
    // Alle GPU-Objekte sind weg: neu aufbauen. Gelingt das nicht, bleibt das Feld still (2D ist auf dieser Leinwand nicht mehr möglich).
    const gl = this.gl
    this.glLost = false
    if (!gl || !this.initGl(gl)) this.mode = 'off'
  }
  private rgb: [number, number, number] = [0.37, 0.5, 0.9]

  constructor(private readonly c: HTMLCanvasElement) {
    if (reduced()) return
    try {
      const gl = c.getContext('webgl2')
      if (gl && this.initGl(gl)) {
        this.mode = 'webgl2'
        c.addEventListener?.('webglcontextlost', this.onLost)
        c.addEventListener?.('webglcontextrestored', this.onRestored)
      }
    } catch {
      /* weiter mit 2D */
    }
    if (this.mode === 'off') {
      try {
        const ctx = c.getContext('2d')
        if (ctx) {
          this.ctx = ctx
          this.mode = '2d'
        }
      } catch {
        /* aus */
      }
    }
    if (this.mode === 'off') return
    this.setDensity(60)
    this.readColor()
    this.watchSize()
    this.loop()
  }

  setDensity(n: number): void {
    const count = Math.max(0, Math.min(MAX, Math.round(Number.isFinite(n) ? n : 0)))
    while (this.parts.length < count) this.parts.push(this.seed())
    this.parts.length = count
  }

  dive(ms: number): Promise<void> {
    return this.fly(1, ms)
  }

  surface(ms: number): Promise<void> {
    return this.fly(0, ms)
  }

  stream(from: Pt, to: Pt, ms: number): Promise<void> {
    if (this.mode === 'off' || !(ms > 0)) return Promise.resolve()
    this.streams.push({ a: { x: from.x, y: from.y }, b: { x: to.x, y: to.y }, t: 0, ms })
    return new Promise((res) => setTimeout(res, ms))
  }

  /** Zurück in den ruhigen Zustand (für „Nochmal“ und „Nächster Ablauf“): keine Ströme, kein Tiefenflug. */
  reset(): void {
    this.streams = []
    this.boost = this.boostTarget = 0
  }

  destroy(): void {
    if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf)
    this.raf = 0
    this.ro?.disconnect()
    this.c.removeEventListener?.('webglcontextlost', this.onLost)
    this.c.removeEventListener?.('webglcontextrestored', this.onRestored)
    this.parts = []
    this.streams = []
    try {
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      /* egal */
    }
    this.gl = null
    this.ctx = null
    this.mode = 'off'
  }

  private fly(target: number, ms: number): Promise<void> {
    if (this.mode === 'off' || !(ms > 0)) {
      this.boost = this.boostTarget = target
      return Promise.resolve()
    }
    this.boostTarget = target
    return new Promise((res) => setTimeout(res, ms))
  }

  private seed(): P {
    return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), a: 0.25 + Math.random() * 0.5 }
  }

  private readColor(): void {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--focus').trim()
      const m = /^#([0-9a-f]{6})$/i.exec(v)
      if (m) {
        const n = parseInt(m[1], 16)
        this.rgb = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
      }
    } catch {
      /* Standardfarbe */
    }
  }

  private watchSize(): void {
    const fit = () => {
      const d = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2)
      const w = Math.max(1, Math.round((this.c.clientWidth || 300) * d))
      const h = Math.max(1, Math.round((this.c.clientHeight || 150) * d))
      if (this.c.width !== w) this.c.width = w
      if (this.c.height !== h) this.c.height = h
      this.gl?.viewport(0, 0, w, h)
    }
    fit()
    if (typeof ResizeObserver === 'function') {
      this.ro = new ResizeObserver(fit)
      this.ro.observe(this.c)
    }
  }

  private initGl(gl: WebGL2RenderingContext): boolean {
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = mk(gl.VERTEX_SHADER, VS)
    const fs = mk(gl.FRAGMENT_SHADER, FS)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return false
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
    this.gl = gl
    this.prog = prog
    this.buf = gl.createBuffer()
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    return true
  }

  private loop = (): void => {
    if (this.mode === 'off' || typeof requestAnimationFrame !== 'function') return
    this.raf = requestAnimationFrame((now) => {
      const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016)
      this.last = now
      this.step(dt)
      this.draw()
      this.loop()
    })
  }

  private step(dt: number): void {
    this.boost += (this.boostTarget - this.boost) * Math.min(1, dt * 3)
    const v = 0.02 + this.boost * 0.9
    for (const p of this.parts) {
      // Tiefenflug: Partikel strömen von der Mitte nach außen
      const r = Math.hypot(p.x, p.y) || 0.01
      p.x += (p.x / r) * v * dt * (0.4 + p.z) + Math.sin(p.y * 3 + p.z * 6) * 0.004 * dt
      p.y += (p.y / r) * v * dt * (0.4 + p.z) + 0.004 * dt
      if (Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) {
        const q = this.seed()
        const k = this.boost > 0.3 ? 0.15 : 1
        p.x = q.x * k
        p.y = q.y * k
        p.z = q.z
      }
    }
    for (const s of this.streams) s.t += dt * 1000
    this.streams = this.streams.filter((s) => s.t < s.ms)
  }

  private points(): P[] {
    const out = this.parts.slice(0, MAX - this.streams.length * 8)
    for (const s of this.streams) {
      const k = Math.min(1, s.t / s.ms)
      for (let i = 0; i < 8; i++) {
        const f = Math.max(0, k - i * 0.03)
        // Eingabepunkte sind CSS-Pixel, die Leinwand rechnet in Gerätepixeln
        const d = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2)
        const w = (this.c.width || 1) / d
        const h = (this.c.height || 1) / d
        out.push({
          x: ((s.a.x + (s.b.x - s.a.x) * f) / w) * 2 - 1,
          y: 1 - ((s.a.y + (s.b.y - s.a.y) * f) / h) * 2,
          z: 1 - i / 8,
          a: 1 - i / 8,
        })
      }
    }
    return out
  }

  private draw(): void {
    if (this.glLost) return // Kontext verloren: nichts zeichnen, bis er zurück ist
    const pts = this.points()
    if (this.gl && this.prog && this.buf) {
      const gl = this.gl
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(this.prog)
      pts.forEach((p, i) => {
        this.data[i * 3] = p.x
        this.data[i * 3 + 1] = p.y
        this.data[i * 3 + 2] = p.z
      })
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
      gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, pts.length * 3), gl.DYNAMIC_DRAW)
      const loc = gl.getAttribLocation(this.prog, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
      gl.uniform1f(gl.getUniformLocation(this.prog, 'uPx'), Math.max(6, this.c.width / 90))
      gl.uniform3f(gl.getUniformLocation(this.prog, 'uC'), ...this.rgb)
      gl.uniform1f(gl.getUniformLocation(this.prog, 'uA'), 0.6)
      gl.drawArrays(gl.POINTS, 0, pts.length)
    } else if (this.ctx) {
      const c = this.ctx
      const w = this.c.width
      const h = this.c.height
      c.clearRect(0, 0, w, h)
      const [r, g, b] = this.rgb.map((x) => Math.round(x * 255))
      for (const p of pts) {
        const rad = Math.max(2, (w / 180) * (0.5 + p.z))
        c.fillStyle = `rgba(${r},${g},${b},${(p.a * 0.5).toFixed(3)})`
        c.beginPath()
        c.arc(((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h, rad, 0, Math.PI * 2)
        c.fill()
      }
    }
  }
}
