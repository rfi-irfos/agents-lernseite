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

type TW = { __player?: { index: number; state: string; step: { station: string }; goTo(i: number): void } }

async function check(page: Page, label: string, station: string): Promise<void> {
  const m = await page.evaluate(({ slots, station }) => {
    const se = document.scrollingElement!
    const bad: string[] = []
    for (const s of slots) {
      const el = document.querySelector<HTMLElement>(`[data-slot=${s}]`)
      if (!el) { bad.push(`${s} fehlt`); continue }
      const r = el.getBoundingClientRect()
      if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) bad.push(`${s} ragt aus dem Bild`)
      // Die Chatblase im Eingabe-Slot ist absolut gesetzt und rückt bewusst nach oben (ergebnis.ts); sie wird unten gesondert geprüft.
      // Jeder andere Inhalt des Eingabe-Slots wird auf Überlauf geprüft: alle Nachfahren außerhalb der Blase liegen im Slot.
      if (s === 'eingabe') {
        if (el.scrollWidth > el.clientWidth + 1 && !el.querySelector('.chatblase')) bad.push(`eingabe läuft über (Breite)`)
        for (const c of el.querySelectorAll<HTMLElement>('*')) {
          if (c.closest('.chatblase')) continue
          const q = c.getBoundingClientRect()
          if (q.width === 0 && q.height === 0) continue
          if (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1) bad.push(`eingabe-Inhalt ragt aus dem Slot: ${c.tagName}.${c.className}`)
        }
      }
      if (s === 'buehne' || s === 'text') {
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) bad.push(`${s} läuft über (${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight})`)
      }
    }
    const blaseEl = document.querySelector<HTMLElement>('.chatblase')
    if (station === 'ergebnis') {
      if (!blaseEl) bad.push('Chatblase fehlt im Ergebnis')
      else if (blaseEl.scrollWidth > blaseEl.clientWidth + 1 || blaseEl.scrollHeight > blaseEl.clientHeight + 1) bad.push(`Chatblase läuft über (${blaseEl.scrollWidth}x${blaseEl.scrollHeight} in ${blaseEl.clientWidth}x${blaseEl.clientHeight})`)
    }
    // Plankarten: kein Wort wird mitten im Wort umbrochen, kein Überlauf, Text zentriert
    for (const k of document.querySelectorAll<HTMLElement>('.plankarte')) {
      const cs = getComputedStyle(k)
      if (cs.overflowWrap !== 'normal') bad.push(`Plankarte overflow-wrap ${cs.overflowWrap}`)
      if (cs.textAlign !== 'center') bad.push(`Plankarte text-align ${cs.textAlign}`)
      if (k.scrollWidth > k.clientWidth + 1) bad.push('Plankarte läuft über')
      const walker = document.createTreeWalker(k, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.textContent ?? ''
        for (const mt of t.matchAll(/\S+/g)) {
          const rg = document.createRange()
          rg.setStart(n, mt.index!)
          rg.setEnd(n, mt.index! + mt[0].length)
          const tops = new Set([...rg.getClientRects()].map((x) => Math.round(x.top)))
          if (tops.size > 1) bad.push(`Plankarte trennt das Wort "${mt[0]}"`)
        }
      }
    }
    const blase = blaseEl?.getBoundingClientRect()
    const steu = document.querySelector('[data-slot=steuerung]')!.getBoundingClientRect()
    if (blase && (blase.left < -0.5 || blase.right > innerWidth + 0.5 || blase.top < -0.5 || blase.bottom > Math.min(innerHeight, steu.top) + 0.5)) {
      bad.push(`Chatblase ragt hinaus (${Math.round(blase.top)}..${Math.round(blase.bottom)}, Steuerung ab ${Math.round(steu.top)})`)
    }
    return { sh: se.scrollHeight, sw: se.scrollWidth, ih: innerHeight, iw: innerWidth, bad }
  }, { slots: [...SLOTS], station })
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
        const player = () => page.evaluate(() => { const p = (window as unknown as TW).__player!; return { index: p.index, state: p.state, station: p.step.station } })
        const goTo = (i: number) => page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), i)

        let i = 0
        for (;;) {
          await goTo(i)
          await expect.poll(async () => (await player()).index, { message: `${id} Schritt ${i}` }).toBe(i)
          await expect.poll(async () => (await player()).state).not.toBe('transition')
          await check(page, `${id} ${v.w}x${v.h} ${scheme} Schritt ${i}`, (await player()).station)
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

test('Szene meldet ihr Ende (data-szene=fertig), auch bei echter Bewegung', async ({ page }) => {
  await page.goto('/?test=1&motion=1')
  await page.locator('[data-card=programm]').click()
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await page.evaluate(() => (window as unknown as TW).__player!.pause())
  await page.evaluate(() => (window as unknown as TW).__player!.goTo(5))
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.index)).toBe(5)
  await expect(page.locator('#app')).toHaveAttribute('data-szene', 'fertig', { timeout: 20000 })
  await page.evaluate(() => (window as unknown as TW).__player!.goTo(3))
  await expect(page.locator('#app')).toHaveAttribute('data-szene', 'laeuft', { timeout: 2000 })
})
