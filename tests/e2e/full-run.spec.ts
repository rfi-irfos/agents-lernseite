import { test, expect, type Page } from '@playwright/test'

// Gesamtlauf: fünf Abläufe × sechs Viewports × zwei Themen. Pro Viewport und Thema eine Seite,
// die für alle Abläufe wiederverwendet wird (Neuladen zwischen den Abläufen).
const SLOTS = ['fx', 'buehne', 'text', 'steuerung', 'eingabe'] as const
const SCENARIOS = ['wetter', 'flugsuche', 'programm', 'foto', 'ausflug']
const VIEWPORTS = [
  { w: 320, h: 568 },
  { w: 360, h: 740 },
  { w: 820, h: 1000 },
  { w: 1024, h: 768 },
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
]

type TW = { __player?: { index: number; state: string; goTo(i: number): void } }

async function check(page: Page, label: string): Promise<void> {
  const m = await page.evaluate((slots) => {
    const se = document.scrollingElement!
    const bad: string[] = []
    for (const s of slots) {
      const el = document.querySelector<HTMLElement>(`[data-slot=${s}]`)
      if (!el) { bad.push(`${s} fehlt`); continue }
      const r = el.getBoundingClientRect()
      if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) bad.push(`${s} ragt aus dem Bild`)
      if (s !== 'fx' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) bad.push(`${s} läuft über`)
    }
    return { sh: se.scrollHeight, sw: se.scrollWidth, ih: innerHeight, iw: innerWidth, bad }
  }, [...SLOTS])
  expect(m.sh, `${label} Scroll vertikal`).toBeLessThanOrEqual(m.ih)
  expect(m.sw, `${label} Scroll horizontal`).toBeLessThanOrEqual(m.iw)
  expect(m.bad, label).toEqual([])
}

for (const scheme of ['light', 'dark'] as const) {
  for (const v of VIEWPORTS) {
    test(`Gesamtlauf ${v.w}x${v.h} ${scheme}: alle Abläufe, jeder Schritt`, async ({ browser }) => {
      test.setTimeout(240000)
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: v.w, height: v.h } })
      const page = await ctx.newPage()
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
      })
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

      for (const id of SCENARIOS) {
        await page.goto('/?test=1')
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
        await page.locator(`[data-card=${id}]`).click()
        await page.getByRole('button', { name: 'Ablauf starten' }).click()
        await page.waitForFunction(() => !!(window as unknown as TW).__player)
        const player = () => page.evaluate(() => { const p = (window as unknown as TW).__player!; return { index: p.index, state: p.state } })
        const goTo = (i: number) => page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), i)

        let i = 0
        for (;;) {
          await goTo(i)
          await expect.poll(async () => (await player()).index, { message: `${id} Schritt ${i}` }).toBe(i)
          await expect.poll(async () => (await player()).state).not.toBe('transition')
          await check(page, `${id} ${v.w}x${v.h} ${scheme} Schritt ${i}`)
          // letzter Schritt: ein weiterer goTo bleibt auf demselben Index
          await goTo(i + 1)
          await page.waitForTimeout(30)
          if ((await player()).index === i) break
          i++
          expect(i, 'Schrittzahl plausibel').toBeLessThan(40)
        }
        expect(i, `${id} hat mehrere Schritte`).toBeGreaterThan(5)
      }
      expect(errors).toEqual([])
      await ctx.close()
    })
  }
}
