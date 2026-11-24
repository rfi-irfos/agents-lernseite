// Kontaktblatt: je Ablauf, Format und Schritt ein Bild, dazu test-out/contact/index.html.
// Läuft nur auf der Kolonie (Browser). Erwartet die gebaute App unter BASE_URL (Standard http://localhost:4174).
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs'
import { chromium, type Page } from '@playwright/test'
import { scenarios } from '../src/scenarios'

const BASE = process.env.BASE_URL ?? 'http://localhost:4174'
const OUT = 'test-out/contact'
const SCENARIOS = scenarios.map((s) => s.id)
const FORMATS = [
  { id: 'hoch', w: 360, h: 740 },
  { id: 'quadrat', w: 820, h: 1000 },
  { id: 'quer', w: 1366, h: 768 },
] as const

type TW = {
  __player?: { index: number; state: string; steps: { station: string; pass: number }[]; goTo(i: number): void; pause(): void }
}
type Shot = { file: string; label: string }

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function settle(page: Page, i: number): Promise<void> {
  await page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), i)
  await page.waitForFunction((n) => (window as unknown as TW).__player!.index === n, i, { timeout: 15000 })
  // Endzustand abwarten: die Szene meldet ihr Ende (data-szene=fertig, src/scenes/run.ts), danach kurz ausklingen lassen
  await page.waitForSelector('#app[data-szene=fertig]', { timeout: 60000 })
  await page.waitForTimeout(500)
}

async function main(): Promise<void> {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const result: Record<string, Record<string, Shot[]>> = {}
  for (const id of SCENARIOS) {
    result[id] = {}
    for (const f of FORMATS) {
      const ctx = await browser.newContext({ viewport: { width: f.w, height: f.h }, colorScheme: 'light' })
      const page = await ctx.newPage()
      await page.goto(`${BASE}/?test=1&motion=1`)
      await page.locator(`[data-card=${id}]`).click()
      await page.getByRole('button', { name: 'Ablauf starten' }).click()
      await page.waitForFunction(() => !!(window as unknown as TW).__player, undefined, { timeout: 30000 })
      await page.evaluate(() => (window as unknown as TW).__player!.pause())
      const n = await page.evaluate(() => (window as unknown as TW).__player!.steps.length)
      const shots: Shot[] = []
      for (let i = 0; i < n; i++) {
        await settle(page, i)
        const st = await page.evaluate(() => {
          const p = (window as unknown as TW).__player!
          return p.steps[p.index]
        })
        const file = `${id}-${f.id}-${String(i).padStart(2, '0')}-${st.station}${st.pass === 2 ? '-2' : ''}.jpg`
        await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 70 })
        shots.push({ file, label: `${i + 1}. ${st.station}${st.pass === 2 ? ' (zweiter Durchgang)' : ''}` })
      }
      result[id][f.id] = shots
      await ctx.close()
      console.log(`${id} ${f.id}: ${shots.length} Bilder`)
    }
  }
  await browser.close()

  const body = SCENARIOS.map(
    (id) =>
      `<section><h2>${esc(id)}</h2>${FORMATS.map(
        (f) =>
          `<h3>${f.id} (${f.w}×${f.h})</h3><div class="row ${f.id}">${result[id][f.id]
            .map((s) => `<figure><img loading="lazy" src="${s.file}" alt="${esc(id)} ${f.id} ${esc(s.label)}"><figcaption>${esc(s.label)}</figcaption></figure>`)
            .join('')}</div>`,
      ).join('')}</section>`,
  ).join('')
  writeFileSync(
    `${OUT}/index.html`,
    `<!doctype html><html lang="de"><meta charset="utf-8"><title>Kontaktblatt</title><style>
body{font:14px system-ui,sans-serif;margin:16px;background:#f4f6fa;color:#1b2433}
h2{margin:32px 0 4px;border-bottom:2px solid #1b2433}h3{margin:16px 0 6px}
.row{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}
figure{margin:0;flex:none}figcaption{font-size:12px;padding:2px 0}
.hoch img{height:360px}.quadrat img{height:300px}.quer img{height:240px}
img{display:block;border:1px solid #d5dce8}
</style><body><h1>Kontaktblatt: So arbeitet ein KI-Agent</h1>${body}</body></html>`,
  )
  let bytes = 0
  let count = 0
  for (const f of readdirSync(OUT)) if (f.endsWith('.jpg')) { bytes += statSync(`${OUT}/${f}`).size; count++ }
  console.log(`${count} Bilder, ${(bytes / 1048576).toFixed(1)} MB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
