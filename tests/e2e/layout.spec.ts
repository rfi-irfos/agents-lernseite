import { test, expect } from '@playwright/test'

const SLOTS = ['fx', 'buehne', 'text', 'steuerung', 'eingabe'] as const

const cases = [
  { w: 320, h: 568, format: 'hoch' },
  { w: 360, h: 740, format: 'hoch' },
  { w: 820, h: 1000, format: 'quadrat' },
  { w: 1024, h: 768, format: 'quer' },
  { w: 1366, h: 768, format: 'quer' },
  { w: 1920, h: 1080, format: 'quer' },
]

for (const c of cases) {
  test(`${c.w}x${c.h}: Format ${c.format}, kein Scroll, Slots im Bild`, async ({ page }) => {
    await page.setViewportSize({ width: c.w, height: c.h })
    await page.goto('/')
    await expect(page.locator('#app')).toHaveAttribute('data-format', c.format)

    const m = await page.evaluate((slots) => {
      const se = document.scrollingElement!
      const rects = slots.map((s) => {
        const el = document.querySelector(`[data-slot=${s}]`)
        const r = el?.getBoundingClientRect()
        return { s, found: !!el, l: r?.left ?? -1, t: r?.top ?? -1, r: r?.right ?? -1, b: r?.bottom ?? -1, w: r?.width ?? 0, h: r?.height ?? 0 }
      })
      return {
        sh: se.scrollHeight,
        sw: se.scrollWidth,
        ih: innerHeight,
        iw: innerWidth,
        rects,
      }
    }, [...SLOTS])

    expect(m.sh).toBeLessThanOrEqual(m.ih)
    expect(m.sw).toBeLessThanOrEqual(m.iw)
    for (const r of m.rects) {
      expect(r.found, r.s).toBe(true)
      expect(r.w, `${r.s} Breite`).toBeGreaterThan(10)
      expect(r.h, `${r.s} Höhe`).toBeGreaterThan(10)
      expect(r.l, `${r.s} links`).toBeGreaterThanOrEqual(-0.5)
      expect(r.t, `${r.s} oben`).toBeGreaterThanOrEqual(-0.5)
      expect(r.r, `${r.s} rechts`).toBeLessThanOrEqual(m.iw + 0.5)
      expect(r.b, `${r.s} unten`).toBeLessThanOrEqual(m.ih + 0.5)
    }
  })
}

test('quer: Bühne links, höchstens min(100vw, 2.2 × 100dvh)', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-slot=buehne]')!.getBoundingClientRect()
    const t = document.querySelector('[data-slot=text]')!.getBoundingClientRect()
    return { bw: b.width, bl: b.left, tl: t.left, iw: innerWidth, ih: innerHeight }
  })
  expect(r.bl).toBeLessThan(r.tl)
  expect(r.bw).toBeLessThanOrEqual(Math.min(r.iw, 2.2 * r.ih) + 0.5)
  expect(r.bw / r.iw).toBeGreaterThan(0.5)
  expect(r.bw / r.iw).toBeLessThan(0.7)
})

test('Drehen 360x740 auf 740x360 morpht in höchstens 700 ms, kein Sprung', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(page.locator('#app')).toHaveAttribute('data-format', 'hoch')

  await page.evaluate(() => {
    const w = window as unknown as { __m: Record<string, unknown> }
    const rect = (): number[] => {
      const r = document.querySelector('[data-slot=buehne]')!.getBoundingClientRect()
      return [r.left, r.top, r.width, r.height]
    }
    const app = document.querySelector('#app')!
    const m: Record<string, unknown> = { start: rect() }
    w.__m = m
    new MutationObserver(() => {
      if (app.getAttribute('data-format') !== 'quer' || m.t0) return
      const t0 = performance.now()
      m.t0 = t0
      m.first = rect()
      setTimeout(() => (m.s100 = rect()), 100)
      setTimeout(() => (m.s300 = rect()), 300)
      setTimeout(() => {
        m.s700 = rect()
        m.done = true
      }, 700)
    }).observe(app, { attributes: true, attributeFilter: ['data-format'] })
  })
  await page.setViewportSize({ width: 740, height: 360 })
  await page.waitForFunction(() => (window as unknown as { __m: { done?: boolean } }).__m.done === true)
  await page.waitForTimeout(100)

  const m = await page.evaluate(() => {
    const w = window as unknown as { __m: Record<string, number[]> }
    const r = document.querySelector('[data-slot=buehne]')!.getBoundingClientRect()
    return { ...w.__m, end: [r.left, r.top, r.width, r.height] } as Record<string, number[]>
  })
  // Das Fenster hat schon die neue Größe, der Morph startet in der alten Anordnung (m.first)
  const start = m.first as number[]
  const end = m.end as number[]
  expect(end.some((v, i) => Math.abs(v - (m.start as number[])[i]) > 20)).toBe(true)
  expect(end.some((v, i) => Math.abs(v - start[i]) > 20)).toBe(true)
  // nach 700 ms ist die Endlage erreicht
  for (let i = 0; i < 4; i++) expect(Math.abs((m.s700 as number[])[i] - end[i])).toBeLessThan(2)
  for (const key of ['s100', 's300'] as const) {
    const s = m[key] as number[]
    for (let i = 0; i < 4; i++) {
      const lo = Math.min(start[i], end[i]) - 2
      const hi = Math.max(start[i], end[i]) + 2
      expect(s[i], `${key}[${i}] zwischen Start und Ende`).toBeGreaterThanOrEqual(lo)
      expect(s[i], `${key}[${i}] zwischen Start und Ende`).toBeLessThanOrEqual(hi)
    }
    const strictlyBetween = s.some((v, i) => Math.abs(v - start[i]) > 3 && Math.abs(v - end[i]) > 3)
    expect(strictlyBetween, `${key} ist ein Zwischenbild`).toBe(true)
  }
})

test('reduzierte Bewegung: Formatwechsel ohne Flug, Endlage sofort nach 250 ms', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 360, height: 740 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.setViewportSize({ width: 740, height: 360 })
  await expect(page.locator('#app')).toHaveAttribute('data-format', 'quer')
  await page.waitForTimeout(450)
  const ok = await page.evaluate(() => {
    const el = document.querySelector('[data-slot=buehne]') as HTMLElement
    return getComputedStyle(el).transform === 'none' && getComputedStyle(document.querySelector('#app')!).opacity === '1'
  })
  expect(ok).toBe(true)
  await ctx.close()
})

test('reduzierte Bewegung: der zuletzt angeforderte Wechsel gewinnt, auch mitten in der Überblendung', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 360, height: 740 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.locator('#app')).toHaveAttribute('data-format', 'hoch')
  await page.evaluate(async () => {
    const path = '/src/ui/layout.ts'
    const mod = await import(/* @vite-ignore */ path)
    mod.applyFormat('quer')
    await new Promise((r) => setTimeout(r, 30))
    mod.applyFormat('hoch')
  })
  await page.waitForTimeout(500)
  await expect(page.locator('#app')).toHaveAttribute('data-format', 'hoch')
  const vis = await page.evaluate(() => ({
    op: getComputedStyle(document.querySelector('#app')!).opacity,
    tr: getComputedStyle(document.querySelector('[data-slot=buehne]')!).transform,
  }))
  expect(vis.op).toBe('1')
  expect(vis.tr).toBe('none')
  await ctx.close()
})
