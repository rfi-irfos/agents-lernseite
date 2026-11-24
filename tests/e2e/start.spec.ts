import { test, expect } from '@playwright/test'

const AUFGABE = 'Brauche ich morgen in Graz einen Schirm?'

test('Start zeigt nur Aufgabe, 4 bis 5 Karten, Feld unten, Knopf und Hinweis', async ({ page }) => {
  await page.goto('/?test=1')
  await expect(page.getByRole('heading', { name: 'Deine Aufgabe' })).toBeVisible()
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
  const t0 = Date.now()
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'play', { timeout: 2000 })
  expect(Date.now() - t0).toBeLessThan(1000)
  await page.waitForTimeout(400)
  const tf = await page.evaluate(() => (window as unknown as { __tf: string[] }).__tf)
  expect(tf.length).toBeGreaterThan(0)
  for (const t of tf) expect(t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
  const stage = await page.evaluate(() => getComputedStyle(document.querySelector('[data-slot=buehne]')!).transform)
  expect(stage === 'none' || stage === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
  await ctx.close()
})
