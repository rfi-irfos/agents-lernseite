import { test, expect, type Page } from '@playwright/test'

type TW = {
  __player?: { index: number; state: string; goTo(i: number): void; next(): void }
  __events?: { type: string; [k: string]: unknown }[]
}

async function toDone(page: Page, query = '', size?: { width: number; height: number }) {
  if (size) await page.setViewportSize(size)
  await page.goto(`/?test=1&fixtures=1${query}`)
  await page.getByRole('textbox').fill('wetter')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await page.evaluate(() => (window as unknown as TW).__player!.goTo(9999))
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.index)).toBeGreaterThan(3)
  await page.evaluate(() => (window as unknown as TW).__player!.next())
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.state)).toBe('done')
}

const MERKSATZ =
  'Ein Agent wird nur besser, wenn er Rückmeldung bekommt, sie speichert und beim nächsten Mal nutzt. Ohne Prüfung durch einen Menschen kann er auch schlechter werden.'
const weiter = (page: Page) => page.locator('[data-action=rb-weiter]')
const teile = (page: Page) =>
  page.evaluate(() => (window as unknown as TW).__events!.filter((e) => e.type === 'rueckblick').map((e) => e.teil))

test('nach done folgt der Kreislauf: acht Stationen im Kreis, Gedächtnis als Seitenarm, Klick zeigt den Satz', async ({ page }) => {
  await toDone(page)
  await expect(page.locator('.rb-kreis')).toBeVisible()
  await expect(page.locator('.rb-node[data-station]:not(.rb-mem)')).toHaveCount(8)
  await expect(page.locator('.rb-mem')).toHaveCount(1)
  const radii = await page.evaluate(() => {
    const k = document.querySelector('.rb-kreis')!.getBoundingClientRect()
    return Array.from(document.querySelectorAll('.rb-node:not(.rb-mem)')).map((n) => {
      const r = n.getBoundingClientRect()
      return Math.hypot(r.left + r.width / 2 - (k.left + k.width / 2), r.top + r.height / 2 - (k.top + k.height / 2)) / k.width
    })
  })
  for (const r of radii) expect(Math.abs(r - radii[0])).toBeLessThan(0.01)
  await page.locator('.rb-node[data-station=denken]').click()
  await expect(page.locator('.rb-satz')).toHaveText('Der Agent überlegt, welche Schritte zur Lösung passen.')
  await page.locator('.rb-node[data-station=ergebnis]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.rb-satz')).toHaveText('Er gibt dir die Antwort.')
  await page.locator('.rb-mem').click()
  await expect(page.locator('.rb-satz')).toContainText('Schublade')
  expect(await teile(page)).toEqual(['kreislauf'])
})

test('Done-Knöpfe bleiben im Rückblick bedienbar', async ({ page }) => {
  await toDone(page)
  await expect(page.locator('.rb-kreis')).toBeVisible()
  await expect(page.locator('[data-action=nochmal]')).toBeVisible()
  await expect(page.locator('[data-action=weiter-ablauf]')).toBeVisible()
})

test('die Kugel umrundet den Kreis zweimal, gleichmäßig vorwärts', async ({ page }) => {
  test.setTimeout(40_000)
  await toDone(page, '&motion=1')
  const seen: number[] = []
  await expect
    .poll(
      async () => {
        const a = await page.locator('.rb-kreis').getAttribute('data-angle')
        if (a !== null) seen.push(Number(a))
        return Number(a ?? 0)
      },
      { timeout: 20_000, intervals: [100] },
    )
    .toBe(720)
  for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1])
  expect(seen.filter((a) => a > 0 && a < 720).length).toBeGreaterThan(5)
})

test('reduzierte Bewegung: keine Umrundung, die Hervorhebung wechselt von Station zu Station', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 800, height: 600 } })
  const page = await ctx.newPage()
  await toDone(page, '&motion=1')
  const lit = new Set<string>()
  await expect
    .poll(
      async () => {
        const l = await page.locator('.rb-node[data-lit]').first().getAttribute('data-station').catch(() => null)
        if (l) lit.add(l)
        return lit.size
      },
      { timeout: 10_000, intervals: [60] },
    )
    .toBeGreaterThanOrEqual(5)
  expect(await page.locator('.rb-orb').evaluate((o) => getComputedStyle(o).opacity)).toBe('0')
  const angles = await page.evaluate(() => document.querySelector('.rb-kreis')!.getAttribute('data-angle'))
  expect(angles === null || angles === '720').toBe(true)
  await ctx.close()
})

test('Wird der Agent besser: drei Knöpfe, Merksatz wörtlich, Linie morpht stufenlos', async ({ page }) => {
  await toDone(page, '&motion=1')
  await weiter(page).click()
  await expect(page.locator('.rb-chart')).toBeVisible()
  await expect(page.locator('.rb-merke')).toHaveText(`Merke: ${MERKSATZ}`)
  const opts = page.locator('.rb-opt')
  await expect(opts).toHaveCount(3)
  await expect(page.locator('.rb-opt[data-curve=besser]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.rb-punkt')).toHaveCount(6)
  const d0 = await page.locator('.rb-line').getAttribute('d')
  const ds: string[] = []
  await page.locator('.rb-opt[data-curve=schlechter]').click()
  await expect(page.locator('.rb-opt[data-curve=schlechter]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.rb-opt[data-curve=besser]')).toHaveAttribute('aria-pressed', 'false')
  await expect
    .poll(
      async () => {
        const d = (await page.locator('.rb-line').getAttribute('d'))!
        ds.push(d)
        return d
      },
      { timeout: 5_000, intervals: [30] },
    )
    .toBe('M44.00 78.00 L94.00 87.60 L144.00 97.20 L194.00 108.00 L244.00 117.60 L294.00 126.00')
  const mid = new Set(ds.filter((d) => d !== d0 && !d.startsWith('M44.00 78.00 L94.00 87.60')))
  expect(mid.size).toBeGreaterThan(3)
  // gleich viele Befehle in jedem Zwischenbild
  for (const d of ds) expect(d.split(/(?=[ML])/).length).toBe(6)
  await page.locator('.rb-opt[data-curve=gleich]').click()
  await expect(page.locator('.rb-satz')).toHaveText('Gleiche Rückmeldung, gleiche Runde: Der Agent bleibt auf seinem Stand.')
})

test('reduzierte Bewegung: die Linie blendet höchstens 200 ms über, kein Zwischenbild', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 800, height: 600 } })
  const page = await ctx.newPage()
  await toDone(page, '&motion=1')
  await weiter(page).click()
  const start = await page.locator('.rb-line').getAttribute('d')
  await page.locator('.rb-opt[data-curve=gleich]').click()
  const t0 = Date.now()
  const ds = new Set<string>()
  await expect
    .poll(
      async () => {
        const d = (await page.locator('.rb-line').getAttribute('d'))!
        ds.add(d)
        return d !== start
      },
      { timeout: 2_000, intervals: [20] },
    )
    .toBe(true)
  expect(ds.size).toBeLessThanOrEqual(2)
  expect(Date.now() - t0).toBeLessThan(900)
  await ctx.close()
})

test('Auswahl: gesehene Abläufe mit Haken, Klick startet genau einen neuen Ablauf', async ({ page }) => {
  await toDone(page)
  await weiter(page).click()
  await weiter(page).click()
  expect(await teile(page)).toEqual(['kreislauf', 'besser', 'auswahl'])
  const karten = page.locator('.rb-karte')
  expect(await karten.count()).toBeGreaterThanOrEqual(1)
  const wetter = page.locator('.rb-karte[data-card=wetter]')
  await expect(wetter).toHaveAttribute('data-seen', 'true')
  await expect(wetter.locator('svg.rb-haken')).toHaveCount(1)
  await expect(wetter.locator('.sr-only')).toHaveText('gesehen')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('agents.seen') ?? '[]'))).toContain('wetter')
  const ungesehen = page.locator('.rb-karte:not([data-seen])').first()
  if ((await ungesehen.count()) > 0) await expect(ungesehen.locator('svg')).toHaveCount(0)
  await wetter.click()
  await page.waitForFunction(() => (window as unknown as TW).__player?.state !== 'done')
  await expect(page.locator('.rb-stage')).toHaveCount(0)
  await expect(page.locator('.controls')).toHaveCount(1)
  await expect(page.locator('.progress')).toHaveCount(1)
  await expect(page.locator('[data-action=theme]')).toHaveCount(1)
  expect(await page.evaluate(() => (window as unknown as TW).__player!.index)).toBe(0)
  const starts = await page.evaluate(() => (window as unknown as TW).__events!.filter((e) => e.type === 'step' && e.index === 0).length)
  expect(starts).toBe(2)
})

test('Nochmal im Rückblick räumt den Rückblick ab', async ({ page }) => {
  await toDone(page)
  await expect(page.locator('.rb-kreis')).toBeVisible()
  await page.locator('[data-action=nochmal]').click()
  await expect(page.locator('.rb-stage')).toHaveCount(0)
  await expect(page.locator('.rb-text')).toHaveCount(0)
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
})

for (const size of [
  { width: 320, height: 568 },
  { width: 1024, height: 768 },
  { width: 1920, height: 1080 },
  { width: 800, height: 360 },
]) {
  test(`Rückblick passt ohne Scrollen in ${size.width}×${size.height}`, async ({ page }) => {
    await toDone(page, '', size)
    for (const teil of ['kreislauf', 'besser', 'auswahl']) {
      await expect(page.locator(teil === 'kreislauf' ? '.rb-kreis' : teil === 'besser' ? '.rb-chart' : '.rb-karten')).toBeVisible()
      if (teil === 'kreislauf') await page.locator('.rb-node[data-station=pruefen]').click()
      const bad = await page.evaluate(() => {
        const out: string[] = []
        const de = document.documentElement
        if (de.scrollWidth > de.clientWidth || de.scrollHeight > de.clientHeight) out.push('Dokument scrollt')
        for (const slotName of ['buehne', 'text']) {
          const slot = document.querySelector(`[data-slot=${slotName}]`)!
          const s = slot.getBoundingClientRect()
          if (slot.scrollHeight > slot.clientHeight + 1 || slot.scrollWidth > slot.clientWidth + 1) out.push(`${slotName} läuft über`)
          for (const e of Array.from(slot.querySelectorAll('.rb-stage *, .rb-text, .rb-text *'))) {
            if (e.closest('svg') && e.tagName !== 'svg') continue
            const r = e.getBoundingClientRect()
            if (r.width === 0 && r.height === 0) continue
            if (r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1)
              out.push(`${slotName}: ${e.className || e.tagName} ragt heraus`)
          }
        }
        const app = document.getElementById('app')!.getBoundingClientRect()
        for (const e of Array.from(document.querySelectorAll('[data-slot=steuerung] button'))) {
          const r = e.getBoundingClientRect()
          if (r.right > app.right + 1 || r.left < app.left - 1 || r.bottom > app.bottom + 1) out.push('Steuerung ragt heraus')
        }
        return out
      })
      expect(bad, teil).toEqual([])
      if (teil !== 'auswahl') await weiter(page).click()
    }
  })
}

test('die Antwort-Blase bleibt voll sichtbar, bis ihre Lesezeit um ist, erst dann beginnt der Rückblick', async ({ page }) => {
  test.setTimeout(40_000)
  await toDone(page, '&motion=1')
  const ergebnis = await page.evaluate(() => document.querySelector('.chat-text')?.textContent ?? '')
  const ms = Math.ceil(((ergebnis.split(/\s+/).filter(Boolean).length / 3) * 1000))
  expect(ms).toBeGreaterThan(1000)
  let full: number | null = null
  let reviewAt: number | null = null
  const t0 = Date.now()
  while (Date.now() - t0 < 15_000 && reviewAt === null) {
    const s = await page.evaluate(() => {
      const b = document.querySelector('.chatblase')
      return { op: b ? Number(getComputedStyle(b).opacity) : null, rb: !!document.querySelector('.rb-stage') }
    })
    if (s.op === 1 && full === null) full = Date.now()
    if (s.rb) reviewAt = Date.now()
    await page.waitForTimeout(40)
  }
  expect(full, 'Blase wurde voll sichtbar').not.toBeNull()
  expect(reviewAt, 'Rückblick begann').not.toBeNull()
  expect(reviewAt! - full!).toBeGreaterThanOrEqual(ms - 150)
})

test('reduzierte Bewegung: die Blase bleibt ebenfalls bis zum Ende der Lesezeit', async ({ browser }) => {
  test.setTimeout(40_000)
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 800, height: 600 } })
  const page = await ctx.newPage()
  await toDone(page, '&motion=1')
  const ergebnis = await page.evaluate(() => document.querySelector('.chat-text')?.textContent ?? '')
  const ms = Math.ceil(((ergebnis.split(/\s+/).filter(Boolean).length / 3) * 1000))
  const t0 = Date.now()
  await expect(page.locator('.rb-stage')).toBeVisible({ timeout: 15_000 })
  expect(Date.now() - t0).toBeGreaterThanOrEqual(ms - 400)
  await ctx.close()
})
