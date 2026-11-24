
import { describe, it, expect } from 'vitest'
import { formatFor } from '../../src/engine/format'
import html from '../../index.html?raw'

describe('index.html', () => {
  it('verweist auf ein Favicon, sonst meldet der Browser einen 404 in der Konsole', () => {
    expect(html).toMatch(/<link rel="icon"[^>]+href="\/icons\/192\.png"/)
  })
  it('hat eine Beschreibung mit echten Umlauten', () => {
    const m = html.match(/<meta name="description" content="([^"]+)"/)
    expect(m).not.toBeNull()
    expect(m![1].length).toBeGreaterThan(40)
  })
})

describe('Format vor dem ersten Zeichnen', () => {
  const m = html.match(/<script id="format-init">([\s\S]*?)<\/script>/)

  it('hat ein Inline-Skript vor dem Modul-Skript, damit der erste Frame schon das richtige Layout hat (sonst springt es, CLS)', () => {
    expect(m).not.toBeNull()
    expect(html.indexOf('id="format-init"')).toBeLessThan(html.indexOf('type="module"'))
  })

  it('setzt dasselbe Format wie formatFor', () => {
    expect(m).not.toBeNull()
    for (const [w, h] of [[360, 740], [412, 823], [820, 1000], [1024, 768], [1920, 1080], [740, 360]]) {
      const el = { dataset: {} as Record<string, string> }
      const doc = { getElementById: (id: string) => (id === 'app' ? el : null) }
      new Function('document', 'innerWidth', 'innerHeight', 'setTimeout', m![1])(doc, w, h, () => 0)
      expect(el.dataset.format, `${w}x${h}`).toBe(formatFor(w, h))
    }
  })
})

describe('Kein Layout-Sprung beim Laden', () => {
  it('#app bleibt unsichtbar, bis der Startbildschirm gebaut ist (data-phase fehlt), sonst springt das Layout (CLS)', () => {
    expect(html).toMatch(/#app:not\(\[data-phase\]\)\s*\{[^}]*visibility:\s*hidden/)
  })
})

describe('Rückfall, wenn das Skript nicht läuft', () => {
  const code = html.match(/<script id="format-init">([\s\S]*?)<\/script>/)![1]

  type El = { dataset: Record<string, string>; style: Record<string, string>; hidden: boolean }
  function run(phase: boolean) {
    const app: El = { dataset: phase ? { phase: 'start' } : {}, style: {}, hidden: false }
    const hint: El = { dataset: {}, style: {}, hidden: true }
    const doc = { getElementById: (id: string) => (id === 'app' ? app : id === 'boot-hint' ? hint : null) }
    const timers: { fn: () => void; ms: number }[] = []
    new Function('document', 'innerWidth', 'innerHeight', 'setTimeout', code)(doc, 360, 740, (fn: () => void, ms: number) => timers.push({ fn, ms }))
    return { app, hint, timers }
  }

  it('noscript macht #app sichtbar', () => {
    expect(html).toMatch(/<noscript>\s*<style>\s*#app\s*\{\s*visibility:\s*visible/)
  })

  it('zeigt nach etwa 3 s ohne Startbildschirm #app und den deutschen Hinweis aus dem HTML', () => {
    expect(html).toMatch(/<p id="boot-hint" hidden>Die Seite lädt gerade\. Lade sie bitte neu\.<\/p>/)
    const { app, hint, timers } = run(false)
    expect(timers).toHaveLength(1)
    expect(timers[0].ms).toBeGreaterThanOrEqual(2500)
    expect(timers[0].ms).toBeLessThanOrEqual(4000)
    timers[0].fn()
    expect(app.style.visibility).toBe('visible')
    expect(hint.hidden).toBe(false)
  })

  it('tut nichts, wenn der Startbildschirm da ist', () => {
    const { app, hint, timers } = run(true)
    timers[0].fn()
    expect(app.style.visibility).toBeUndefined()
    expect(hint.hidden).toBe(true)
  })
})
