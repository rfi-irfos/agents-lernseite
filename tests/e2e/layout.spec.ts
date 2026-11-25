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

test('Ablauf: Bühne über die ganze Breite, Untertitel darunter', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  await page.waitForSelector('#app[data-phase=start]')
  await page.evaluate(() => { document.getElementById('app')!.dataset.phase = 'play' })
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-slot=buehne]')!.getBoundingClientRect()
    const t = document.querySelector('[data-slot=text]')!.getBoundingClientRect()
    return { bw: b.width, bb: b.bottom, tt: t.top, tm: t.left + t.width / 2, iw: innerWidth }
  })
  expect(r.bw / r.iw).toBeGreaterThan(0.9)
  expect(r.tt).toBeGreaterThanOrEqual(r.bb - 0.5)
  expect(Math.abs(r.tm - r.iw / 2)).toBeLessThanOrEqual(2)
})

test('Drehen 360x740 auf 740x360: die Bühne folgt dem Fenster, nichts ragt hinaus', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await page.waitForSelector('#app[data-phase=start]')
  await page.evaluate(() => { document.getElementById('app')!.dataset.phase = 'play' })
  await expect(page.locator('#app')).toHaveAttribute('data-format', 'hoch')
  await page.setViewportSize({ width: 740, height: 360 })
  await expect(page.locator('#app')).toHaveAttribute('data-format', 'quer')
  await page.waitForTimeout(800)
  const m = await page.evaluate(() => {
    const se = document.scrollingElement!
    const rects = ['buehne', 'text', 'steuerung'].map((s) => document.querySelector(`[data-slot=${s}]`)!.getBoundingClientRect())
    return { sw: se.scrollWidth, sh: se.scrollHeight, iw: innerWidth, ih: innerHeight, out: rects.filter((r) => r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5).length, bw: rects[0].width }
  })
  expect(m.sw).toBeLessThanOrEqual(m.iw)
  expect(m.sh).toBeLessThanOrEqual(m.ih)
  expect(m.out).toBe(0)
  expect(m.bw / m.iw).toBeGreaterThan(0.9)
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
