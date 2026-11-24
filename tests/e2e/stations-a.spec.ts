import { test, expect, type Page } from '@playwright/test'

type TestWindow = {
  __player?: { index: number; state: string; goTo(i: number): void; pause(): void; play(): void }
}

async function startAt(page: Page, opts: { eingabe?: string; card?: string; query?: string; at: number }) {
  await page.goto(`/?test=1&fixtures=1${opts.query ?? ''}`)
  if (opts.card) await page.locator(`[data-card=${opts.card}]`).click()
  else await page.getByRole('textbox').fill(opts.eingabe ?? 'zzfix')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TestWindow).__player)
  await goTo(page, opts.at)
}

async function goTo(page: Page, i: number) {
  await page.evaluate((n) => (window as unknown as TestWindow).__player!.goTo(n), i)
  await expect.poll(() => page.evaluate(() => (window as unknown as TestWindow).__player!.index)).toBe(i)
}

const index = (page: Page) => page.evaluate(() => (window as unknown as TestWindow).__player!.index)

test('Wahrnehmung: eine Wortkarte je Wort der Eingabe, ein Erzählsatz', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 1 })
  await expect(page.locator('.wortkarte')).toHaveCount(7)
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
  await expect(page.locator('.wortkarte.wichtig').first()).toBeVisible()
})

test('Wahrnehmung: 500 Zeichen ergeben 9 Karten ohne Überlauf', async ({ page }) => {
  await startAt(page, { eingabe: 'aaaa '.repeat(100).trim(), at: 1 })
  await expect(page.locator('.wortkarte')).toHaveCount(9)
  const over = await page.evaluate(() => {
    const b = document.querySelector('[data-slot=buehne]') as HTMLElement
    const r = b.getBoundingClientRect()
    const bad = [...document.querySelectorAll<HTMLElement>('.wortkarte')].filter((c) => {
      const q = c.getBoundingClientRect()
      return q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1
    }).length
    return { bad, sw: b.scrollWidth > b.clientWidth, sh: b.scrollHeight > b.clientHeight }
  })
  expect(over).toEqual({ bad: 0, sw: false, sh: false })
})

test('Wahrnehmung: ein Wort mit 60 Buchstaben wird umbrochen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await startAt(page, { eingabe: 'x'.repeat(60), at: 1 })
  const ok = await page.evaluate(() => {
    const b = document.querySelector('[data-slot=buehne]') as HTMLElement
    const r = b.getBoundingClientRect()
    return [...document.querySelectorAll<HTMLElement>('.wortkarte')].every((c) => {
      const q = c.getBoundingClientRect()
      return q.left >= r.left - 1 && q.right <= r.right + 1
    })
  })
  expect(ok).toBe(true)
})

test('Denken mit Gedächtnis: Schublade offen, Notiz sichtbar', async ({ page }) => {
  await startAt(page, { at: 2 })
  await expect(page.locator('.schublade[data-open=true]')).toBeVisible()
  await expect(page.locator('.notiz')).toContainText('Zug am Morgen')
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
})

test('Denken ohne Gedächtnis zeigt keine Schublade', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 2 })
  await expect(page.locator('.schublade')).toHaveCount(0)
  await expect(page.locator('.gedankenwolke')).toBeVisible()
})

test('Planung: nummerierte Plankarten', async ({ page }) => {
  await startAt(page, { at: 3 })
  const cards = page.locator('.plankarte')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0).locator('.plan-nr')).toHaveText('1')
  await expect(cards.nth(2).locator('.plan-nr')).toHaveText('3')
})

test('Kurze Station zeigt nur Text und Kugel, keine Plankarten', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 3 })
  await expect(page.locator('.plankarte')).toHaveCount(0)
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
})

test('Werkzeug: drei Quizkarten per Tab, falsche Wahl zeigt die Erklärung, dann weiter', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 4 })
  const karten = page.locator('.quizkarte')
  await expect(karten).toHaveCount(3)
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => document.activeElement?.classList.contains('quizkarte'))) break
  }
  await page.keyboard.press('Tab') // zweite Karte (Taschenrechner, falsch)
  await expect(karten.nth(1)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-slot=text] .erzaehl')).toContainText('Der Wetterdienst weiß')
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
  await expect.poll(() => index(page)).toBe(5)
})

test('Werkzeug: richtige Wahl bestätigt kurz und geht weiter', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 4 })
  await page.locator('.quizkarte').first().click()
  await expect(page.locator('.quizkarte').first()).toHaveAttribute('data-state', 'richtig')
  await expect.poll(() => index(page)).toBe(5)
})

test('Werkzeug: Klick während Pause wird nicht verloren', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 4 })
  await page.evaluate(() => (window as unknown as TestWindow).__player!.pause())
  await page.locator('.quizkarte').nth(2).click()
  await expect.poll(() => index(page)).toBe(5)
})

test('Werkzeug: ohne Tipp wählt der Agent nach 8 s selbst, sichtbar markiert', async ({ page }) => {
  test.setTimeout(30000)
  await startAt(page, { card: 'wetter', at: 4, query: '&auto=1' })
  const richtig = page.locator('.quizkarte').first()
  await expect(richtig).toHaveAttribute('data-agent', 'true', { timeout: 12000 })
  await expect.poll(() => index(page), { timeout: 8000 }).toBe(5)
})

test('jede Station zeigt genau einen Erzählsatz', async ({ page }) => {
  await startAt(page, { at: 0 })
  for (let i = 0; i < 8; i++) {
    await goTo(page, i)
    await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
  }
})
