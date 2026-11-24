
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
      new Function('document', 'innerWidth', 'innerHeight', m![1])(doc, w, h)
      expect(el.dataset.format, `${w}x${h}`).toBe(formatFor(w, h))
    }
  })
})

describe('Startphase vor dem ersten Zeichnen', () => {
  it('#app trägt data-phase="start" schon im HTML, weil start.css erst damit greift (sonst springt das Layout, CLS)', () => {
    expect(html).toMatch(/<div id="app"[^>]*data-phase="start"/)
  })
})
