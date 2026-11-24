import { test, expect, type Page } from '@playwright/test'

type TW = { __player?: { state: string; goTo(i: number): void; next(): void } }

async function swAktiv(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration()
          return !!reg?.active && !!navigator.serviceWorker.controller
        }),
      { timeout: 20000 },
    )
    .toBe(true)
}

test('Manifest: standalone, de, Icons 192/512/maskable', async ({ page, request, baseURL }) => {
  await page.goto('/')
  const href = await page.locator('link[rel=manifest]').getAttribute('href')
  expect(href).toBeTruthy()
  const m = await (await request.get(new URL(href!, baseURL).toString())).json()
  expect(m.display).toBe('standalone')
  expect(m.lang).toBe('de')
  expect(m.name).toBe('So arbeitet ein KI-Agent')
  expect(m.start_url).toBe('/')
  const sizes = (m.icons as { sizes: string; purpose?: string }[]).map((i) => `${i.sizes}${i.purpose ? ':' + i.purpose : ''}`)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')
  expect(sizes).toContain('512x512:maskable')
  await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute('href', /apple-touch-icon\.png$/)
  await expect(page.locator('meta[name=theme-color]').first()).toHaveAttribute('content', /^#/)
})

test('offline: Service Worker aktiv, App startet, fünf Abläufe wählbar, wetter läuft durch, keine Fremdhosts', async ({
  page,
  context,
  baseURL,
}) => {
  const hosts = new Set<string>()
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) hosts.add(new URL(r.url()).host)
  })
  await page.goto('/?test=1')
  await swAktiv(page)
  // alle Dateien sind im Vorab-Speicher, bevor die Verbindung fällt
  await page.waitForTimeout(1500)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Deine Aufgabe' })).toBeVisible()
  const n = await page.locator('[data-card]').count()
  expect(n).toBe(5)
  for (let i = 0; i < n; i++) {
    await page.locator('[data-card]').nth(i).click()
    await expect(page.getByRole('textbox')).not.toHaveValue('')
  }
  await page.getByRole('textbox').fill('wetter')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await page.evaluate(() => (window as unknown as TW).__player!.goTo(9999))
  await page.waitForTimeout(300)
  await page.evaluate(() => (window as unknown as TW).__player!.next())
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.state)).toBe('done')
  const own = new URL(baseURL!).host
  expect([...hosts].filter((h) => h !== own)).toEqual([])
})
