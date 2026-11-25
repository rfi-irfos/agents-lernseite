// Schnelle Sichtprobe der Karte: wenige Bilder statt des ganzen Kontaktblatts. Läuft nur auf der Kolonie.
import { mkdirSync, rmSync } from 'node:fs'
import { chromium, type Page } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:4174'
const OUT = 'test-out/karte'
type TW = { __player?: { index: number; goTo(i: number): void } }

async function gehe(page: Page, i: number): Promise<void> {
  await page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), i)
  await page.waitForFunction((n) => (window as unknown as TW).__player!.index === n, i, { timeout: 15000 })
  await page.waitForSelector('#app[data-szene=fertig]', { timeout: 60000 })
  await page.waitForTimeout(600)
}

async function lauf(name: string, w: number, h: number, scheme: 'light' | 'dark', id: string, schritte: number[]): Promise<void> {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/?test=1&motion=1`)
  await page.locator(`[data-card=${id}]`).click()
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player, undefined, { timeout: 30000 })
  const shot = (s: string) => page.screenshot({ path: `${OUT}/${name}-${s}.jpg`, type: 'jpeg', quality: 78 })
  for (const i of schritte) {
    await gehe(page, i)
    await shot(`schritt-${String(i).padStart(2, '0')}`)
  }
  // Mitten im Flug zum nächsten Knoten
  const letzter = schritte[schritte.length - 1]
  await page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), letzter + 1)
  await page.waitForTimeout(480)
  await shot('flug')
  await page.waitForSelector('#app[data-szene=fertig]', { timeout: 60000 })
  await page.locator('[data-karte=alles]').click()
  await page.waitForTimeout(1200)
  await shot('alles')
  await browser.close()
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
await lauf('quer-dunkel', 1366, 768, 'dark', 'flugsuche', [0, 1, 2, 3, 4, 5])
await lauf('quer-hell', 1366, 768, 'light', 'wetter', [1, 3])
await lauf('hoch-dunkel', 360, 740, 'dark', 'flugsuche', [1, 3, 4])
console.log('fertig')
