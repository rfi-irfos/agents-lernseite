// Kontaktblatt: je Ablauf, Format und Schritt ein Bild, danach die drei Rückblick-Teile; ein Ablauf zusätzlich im dunklen Thema. Dazu test-out/contact/index.html.
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

type Scheme = 'light' | 'dark'
/** Hell: alle Abläufe. Dunkel: ein voller Ablauf in allen drei Formaten (genug für den Farbvergleich). */
const PASSES: { scheme: Scheme; ids: string[] }[] = [
  { scheme: 'light', ids: SCENARIOS },
  { scheme: 'dark', ids: SCENARIOS.includes('flugsuche') ? ['flugsuche'] : SCENARIOS.slice(0, 1) },
]
const TEILE = [
  { id: 'kreislauf', warte: '.rb-kreis' },
  { id: 'besser', warte: '.rb-chart' },
  { id: 'auswahl', warte: '.rb-karten' },
] as const

/** Nach dem letzten Schritt: done, dann die drei Rückblick-Teile nacheinander festhalten. */
async function rueckblick(page: Page, prefix: string): Promise<Shot[]> {
  const shots: Shot[] = []
  await page.evaluate(() => (window as unknown as TW & { __player: { next(): void } }).__player.next())
  for (const [k, t] of TEILE.entries()) {
    if (k > 0) await page.locator('[data-action=rb-weiter]').click()
    await page.waitForSelector(t.warte, { state: 'visible', timeout: 90000 })
    await page.waitForTimeout(1800) // Kugel, Linie und Einblendung ausklingen lassen
    const file = `${prefix}-rueckblick-${k + 1}-${t.id}.jpg`
    await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 70 })
    shots.push({ file, label: `Rückblick ${k + 1}: ${t.id}` })
  }
  return shots
}

async function main(): Promise<void> {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const result: Record<string, Record<string, Record<string, Shot[]>>> = {}
  for (const pass of PASSES) {
    result[pass.scheme] = {}
    for (const id of pass.ids) {
      result[pass.scheme][id] = {}
      for (const f of FORMATS) {
        const ctx = await browser.newContext({ viewport: { width: f.w, height: f.h }, colorScheme: pass.scheme })
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
          const file = `${pass.scheme}-${id}-${f.id}-${String(i).padStart(2, '0')}-${st.station}${st.pass === 2 ? '-2' : ''}.jpg`
          await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 70 })
          shots.push({ file, label: `${i + 1}. ${st.station}${st.pass === 2 ? ' (zweiter Durchgang)' : ''}` })
        }
        shots.push(...(await rueckblick(page, `${pass.scheme}-${id}-${f.id}`)))
        result[pass.scheme][id][f.id] = shots
        await ctx.close()
        console.log(`${pass.scheme} ${id} ${f.id}: ${shots.length} Bilder`)
      }
    }
  }
  await browser.close()

  const body = PASSES.map((pass) =>
    pass.ids
      .map(
        (id) =>
          `<section class="${pass.scheme}"><h2>${pass.scheme === 'dark' ? 'dunkel' : 'hell'}: ${esc(id)}</h2>${FORMATS.map(
            (f) =>
              `<h3>${f.id} (${f.w}×${f.h})</h3><div class="row ${f.id}">${result[pass.scheme][id][f.id]
                .map((s) => `<figure><img loading="lazy" src="${s.file}" alt="${pass.scheme} ${esc(id)} ${f.id} ${esc(s.label)}"><figcaption>${esc(s.label)}</figcaption></figure>`)
                .join('')}</div>`,
          ).join('')}</section>`,
      )
      .join(''),
  ).join('')
  writeFileSync(
    `${OUT}/index.html`,
    `<!doctype html><html lang="de"><meta charset="utf-8"><title>Kontaktblatt</title><style>
body{font:14px system-ui,sans-serif;margin:16px;background:#f4f6fa;color:#1b2433}
h2{margin:32px 0 4px;border-bottom:2px solid #1b2433}h3{margin:16px 0 6px}
section.dark{background:#070c19;color:#f2f5ff;padding:8px 16px;border-radius:14px}section.dark h2{border-color:#f2f5ff}
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
