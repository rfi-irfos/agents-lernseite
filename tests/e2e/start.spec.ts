import { test, expect } from '@playwright/test'

const AUFGABE = 'Brauche ich morgen in Graz einen Schirm?'

test('Start zeigt nur Aufgabe, 4 bis 5 Karten, Feld unten, Knopf und Hinweis', async ({ page }) => {
  await page.goto('/?test=1')
  await expect(page.getByRole('heading', { name: 'Was soll der Agent für dich tun?' })).toBeVisible()
  const n = await page.locator('[data-card]').count()
  expect(n).toBeGreaterThanOrEqual(4)
  expect(n).toBeLessThanOrEqual(5)
  const input = page.getByRole('textbox')
  await expect(input).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ablauf starten' })).toBeVisible()
  await expect(page.getByText('Im Hintergrund läuft kein echtes KI-Modell.')).toBeVisible()
  const box = await input.boundingBox()
  const vh = page.viewportSize()!.height
  expect(box!.y + box!.height).toBeGreaterThan(vh * 0.6)
})

test('leeres Feld ohne Karte: Knopf deaktiviert, Leerzeichen zählen als leer', async ({ page }) => {
  await page.goto('/?test=1')
  const btn = page.getByRole('button', { name: 'Ablauf starten' })
  await expect(btn).toBeDisabled()
  await page.getByRole('textbox').fill('     ')
  await expect(btn).toBeDisabled()
  await page.getByRole('textbox').fill('Hallo')
  await expect(btn).toBeEnabled()
})

test('Klick auf eine Karte tippt die Aufgabe sichtbar ins Feld', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('[data-card]').filter({ hasText: AUFGABE })
  await card.click()
  const input = page.getByRole('textbox')
  const mid = await input.inputValue()
  expect(mid.length).toBeLessThan(AUFGABE.length) // Tipp-Animation läuft noch
  await expect(input).toHaveValue(AUFGABE, { timeout: 3000 })
  await expect(page.getByRole('button', { name: 'Ablauf starten' })).toBeEnabled()
})

test('Doppelklick auf Ablauf starten ergibt genau ein step-Ereignis', async ({ page }) => {
  await page.goto('/?test=1')
  await page.locator('[data-card]').first().click()
  await expect(page.getByRole('textbox')).not.toHaveValue('')
  await page.getByRole('button', { name: 'Ablauf starten' }).dblclick()
  await expect
    .poll(() => page.evaluate(() => (window.__events ?? []).filter((e) => e.type === 'step').length))
    .toBe(1)
  await page.waitForTimeout(500)
  const steps = await page.evaluate(() => (window.__events ?? []).filter((e) => e.type === 'step').length)
  expect(steps).toBe(1)
})

test('reduzierte Bewegung: Überblendung höchstens 200 ms, kein scale am Eingabefeld', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.getByRole('textbox').fill('Hallo Welt')
  await page.evaluate(() => {
    const w = window as unknown as { __tf: string[] }
    w.__tf = []
    const input = document.querySelector('input,textarea') as HTMLElement
    const rec = () => { if (input.isConnected) w.__tf.push(getComputedStyle(input).transform) }
    const id = setInterval(rec, 16)
    setTimeout(() => clearInterval(id), 2500)
  })
  const ms = await page.evaluate(
    () =>
      new Promise<{ play: number; done: number }>((res) => {
        const t0 = performance.now()
        let play = -1
        const tick = () => {
          const now = performance.now() - t0
          if (play < 0 && document.getElementById('app')!.dataset.phase === 'play') play = now
          if (!document.querySelector('.start-form')) return res({ play, done: now })
          if (now > 3000) return res({ play, done: now })
          requestAnimationFrame(tick)
        }
        document.querySelector<HTMLButtonElement>('.start-form button[type=submit]')!.click()
        requestAnimationFrame(tick)
      }),
  )
  // Ausblenden 100 ms + Einblenden 100 ms, dazu Taktspielraum
  expect(ms.play).toBeGreaterThan(0)
  expect(ms.play).toBeLessThanOrEqual(200)
  expect(ms.done).toBeLessThanOrEqual(300)
  await page.waitForTimeout(400)
  const tf = await page.evaluate(() => (window as unknown as { __tf: string[] }).__tf)
  expect(tf.length).toBeGreaterThan(0)
  for (const t of tf) expect(t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
  const stage = await page.evaluate(() => getComputedStyle(document.querySelector('[data-slot=buehne]')!).transform)
  expect(stage === 'none' || stage === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
  await ctx.close()
})

test('Eintauchen: das Eingabefeld wächst sichtbar zum Rahmen der Bühne', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-card]').first().click()
  await expect(page.getByRole('textbox')).toHaveValue(/.{20,}/, { timeout: 3000 })
  const heights = await page.evaluate(
    () =>
      new Promise<number[]>((res) => {
        const out: number[] = []
        const t0 = performance.now()
        const tick = () => {
          const f = document.querySelector('.start-form')
          if (f) out.push(Math.round(f.getBoundingClientRect().height))
          if (performance.now() - t0 > 900) return res(out)
          requestAnimationFrame(tick)
        }
        document.querySelector<HTMLButtonElement>('.start-form button[type=submit]')!.click()
        requestAnimationFrame(tick)
      }),
  )
  const first = heights[0]
  const stageH = await page.evaluate(() => document.querySelector('[data-slot=buehne]')!.getBoundingClientRect().height)
  expect(Math.max(...heights)).toBeGreaterThan(Math.max(first * 3, stageH * 0.8))
  expect(new Set(heights).size).toBeGreaterThan(4) // weich, kein Sprung
})

test('freie Eingabe ohne Treffer zeigt den Beispiel-Hinweis, Karte nicht', async ({ page }) => {
  await page.goto('/?test=1')
  await page.getByRole('textbox').fill('xyz qqq')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await expect(
    page.getByText('Das ist ein Beispiel. So ähnlich würde ein Agent deine Frage bearbeiten.'),
  ).toBeVisible()
  const ev = await page.evaluate(() => window.__events!.filter((e) => e.type === 'beispiel').length)
  expect(ev).toBe(1)

  await page.goto('/?test=1')
  await page.locator('[data-card]').first().click()
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await expect.poll(() => page.evaluate(() => window.__events!.filter((e) => e.type === 'step').length)).toBe(1)
  await page.waitForTimeout(300)
  await expect(page.getByText('Das ist ein Beispiel.')).toHaveCount(0)
  expect(await page.evaluate(() => window.__events!.filter((e) => e.type === 'beispiel').length)).toBe(0)
})

const START_VIEWS = [
  { w: 320, h: 568 },
  { w: 360, h: 740 },
  { w: 820, h: 1000 },
  { w: 1024, h: 768 },
  { w: 1920, h: 925 },
  { w: 800, h: 360 },
]
for (const v of START_VIEWS) {
  test(`Start wie ein Chat: Eingabefeld mittig, Vorschläge darunter (${v.w}×${v.h})`, async ({ page }) => {
    await page.setViewportSize({ width: v.w, height: v.h })
    await page.goto('/')
    await expect(page.locator('.start-form')).toBeVisible()
    const m = await page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      const cards = Array.from(document.querySelectorAll('[data-card]')).map((c) => c.getBoundingClientRect())
      const slot = r('[data-slot=text]')
      return {
        form: r('.start-form'),
        h1: r('.start-body h1'),
        note: r('.start-note'),
        cards: cards.map((c) => ({ top: c.top, bottom: c.bottom, left: c.left, right: c.right })),
        slotBottom: slot.bottom,
        steuerungTop: r('[data-slot=steuerung]').top,
      }
    })
    const mid = m.form.left + m.form.width / 2
    expect(Math.abs(mid - v.w / 2)).toBeLessThanOrEqual(2)
    expect(m.h1.bottom).toBeLessThanOrEqual(m.form.top)
    expect(m.h1.top).toBeGreaterThanOrEqual(0)
    for (const c of m.cards) {
      expect(c.top).toBeGreaterThanOrEqual(m.form.bottom)
      expect(c.bottom).toBeLessThanOrEqual(m.slotBottom + 0.5)
      expect(c.left).toBeGreaterThanOrEqual(0)
      expect(c.right).toBeLessThanOrEqual(v.w)
    }
    expect(m.note.bottom).toBeLessThanOrEqual(Math.min(m.slotBottom, m.steuerungTop) + 0.5)
    await page.screenshot({ path: `test-out/start/${v.w}x${v.h}.png` })
    await page.emulateMedia({ colorScheme: 'light' })
  })
}
