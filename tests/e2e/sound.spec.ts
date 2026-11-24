import { test, expect, type Page } from '@playwright/test'

type TW = { __player?: { state: string; index: number; goTo(i: number): void; next(): void }; __events?: { type: string; [k: string]: unknown }[] }

async function begin(page: Page, eingabe: string, at: number | null = 1) {
  await page.goto('/?test=1&fixtures=1')
  await page.getByRole('textbox').fill(eingabe)
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  if (at === null) return
  await go(page, at)
}

/** Namen der bisher erzeugten Audio-Objekte (Spion in env.ts, nur im Testmodus). */
const audio = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as TW).__events ?? [])
      .filter((e) => e.type === 'audio')
      .map((e) => String(e.src).replace(/^.*\/(\w+)\.ogg.*$/, '$1')),
  )

/** Anzahl erzeugter Audio-Objekte (nicht Wiedergaben). */
const created = (page: Page) =>
  page.evaluate(() => ((window as unknown as TW).__events ?? []).filter((e) => e.type === 'audio-new').length)

test('ohne Klick auf den Ton-Schalter entsteht kein Audio-Objekt', async ({ page }) => {
  await begin(page, 'zztief')
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.detail')).toHaveCount(0)
  expect(await audio(page)).toEqual([])
  expect(await created(page)).toBe(0)
  await expect(page.locator('[data-action=sound]')).toHaveAttribute('aria-pressed', 'false')
})

test('eingeschaltet spielt das Eintauchen und das Auftauchen, der Zustand überlebt ein Neuladen', async ({ page }) => {
  await begin(page, 'zztief')
  await page.locator('[data-action=sound]').click()
  await expect(page.locator('[data-action=sound]')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => audio(page)).toEqual(['klick']) // Einschalten ist hörbar, der Pool (sechs Elemente) bleibt stumm
  expect(await created(page)).toBe(6)
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  await expect.poll(() => audio(page)).toContain('eintauchen')
  await page.keyboard.press('Escape')
  await expect.poll(() => audio(page)).toContain('auftauchen')

  await begin(page, 'zztief') // Neuladen: der Zustand steht im Speicher
  await expect(page.locator('[data-action=sound]')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => audio(page)).toContain('eintauchen') // Start-Eintauchen
})

test('reduzierte Bewegung ändert den Ton nicht', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await begin(page, 'zztief')
  await page.locator('[data-action=sound]').click()
  await page.locator('[data-action=tiefer]').click()
  await expect.poll(() => audio(page)).toContain('eintauchen')
})

test('alle sechs Effekte liegen im Build und sind höchstens 30 KB groß', async ({ page, request }) => {
  await page.goto('/?test=1')
  for (const n of ['klick', 'wisch', 'eintauchen', 'auftauchen', 'richtig', 'hinweis']) {
    const r = await request.get(`/sfx/${n}.ogg`)
    expect(r.status(), n).toBe(200)
    expect(r.headers()['content-type'], n).toMatch(/ogg|audio/)
    expect((await r.body()).length, n).toBeLessThanOrEqual(30 * 1024)
  }
})

async function go(page: Page, i: number) {
  await page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), i)
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.index)).toBe(i)
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.state)).toMatch(/^(playing|quiz|paused)$/)
}
const count = async (page: Page, n: string) => (await audio(page)).filter((x) => x === n).length

test('Ton an: klick bei Knopf, genau ein wisch je Stationswechsel, erste Station still', async ({ page }) => {
  await begin(page, 'zztief', null)
  await page.locator('[data-action=sound]').click()
  await expect.poll(() => count(page, 'klick')).toBe(1) // der Einschalt-Klick selbst
  await page.locator('[data-action=tempo]').click()
  await expect.poll(() => count(page, 'klick')).toBe(2)
  expect(await count(page, 'wisch')).toBe(0) // Station 0: kein wisch
  await go(page, 1)
  await expect.poll(() => count(page, 'wisch')).toBe(1)
  await page.waitForTimeout(400)
  expect(await count(page, 'wisch')).toBe(1)
  await go(page, 2)
  await expect.poll(() => count(page, 'wisch')).toBe(2)
  await page.waitForTimeout(400)
  expect(await count(page, 'wisch')).toBe(2)
})

test('Ton aus: weder klick noch wisch noch hinweis', async ({ page }) => {
  await begin(page, 'zzschleife', null)
  await page.locator('[data-action=tempo]').click()
  await go(page, 1)
  await go(page, 6)
  await page.evaluate(() => (window as unknown as TW).__player!.next())
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.index)).toBe(7)
  expect(await audio(page)).toEqual([])
})

test('Ton an: hinweis genau einmal beim Schleifenstart, dort kein wisch', async ({ page }) => {
  await begin(page, 'zzschleife', null)
  await page.locator('[data-action=sound]').click()
  await go(page, 6)
  const wisch = await count(page, 'wisch')
  expect(await count(page, 'hinweis')).toBe(0)
  await page.evaluate(() => (window as unknown as TW).__player!.next())
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.index)).toBe(7)
  await expect.poll(() => count(page, 'hinweis')).toBe(1)
  await page.waitForTimeout(400)
  expect(await count(page, 'hinweis')).toBe(1)
  expect(await count(page, 'wisch')).toBe(wisch)
})
