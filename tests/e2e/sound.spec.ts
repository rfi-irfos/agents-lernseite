import { test, expect, type Page } from '@playwright/test'

type TW = { __player?: { state: string; goTo(i: number): void }; __events?: { type: string; [k: string]: unknown }[] }

async function begin(page: Page, eingabe: string) {
  await page.goto('/?test=1&fixtures=1')
  await page.getByRole('textbox').fill(eingabe)
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await page.evaluate(() => (window as unknown as TW).__player!.goTo(1)) // Station mit „Tiefer graben“
  await expect.poll(() => page.evaluate(() => (window as unknown as TW).__player!.state)).toBe('playing')
}

/** Namen der bisher erzeugten Audio-Objekte (Spion in env.ts, nur im Testmodus). */
const audio = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as TW).__events ?? [])
      .filter((e) => e.type === 'audio')
      .map((e) => String(e.src).replace(/^.*\/(\w+)\.ogg.*$/, '$1')),
  )

test('ohne Klick auf den Ton-Schalter entsteht kein Audio-Objekt', async ({ page }) => {
  await begin(page, 'zztief')
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.detail')).toHaveCount(0)
  expect(await audio(page)).toEqual([])
  await expect(page.locator('[data-action=sound]')).toHaveAttribute('aria-pressed', 'false')
})

test('eingeschaltet spielt das Eintauchen und das Auftauchen, der Zustand überlebt ein Neuladen', async ({ page }) => {
  await begin(page, 'zztief')
  await page.locator('[data-action=sound]').click()
  await expect(page.locator('[data-action=sound]')).toHaveAttribute('aria-pressed', 'true')
  expect(await audio(page)).toEqual([]) // Einschalten selbst bleibt still
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
