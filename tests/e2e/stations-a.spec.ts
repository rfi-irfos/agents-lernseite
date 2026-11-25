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
    const b = document.querySelector('.knoten.aktiv .knoten-buehne') as HTMLElement
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

test('Werkzeug: eine Pause während der Erklärung bleibt bestehen, nur Weiter setzt fort', async ({ page }) => {
  await startAt(page, { card: 'wetter', at: 4 })
  await page.locator('.quizkarte').nth(1).click()
  await expect(page.locator('[data-slot=text] .erzaehl')).toContainText('Der Wetterdienst weiß')
  await page.evaluate(() => (window as unknown as TestWindow).__player!.pause())
  await page.waitForTimeout(1500) // länger als die Erklärungszeit im Testmodus
  expect(await index(page)).toBe(4)
  expect(await page.evaluate(() => (window as unknown as TestWindow).__player!.state)).toBe('paused')
  await page.evaluate(() => (window as unknown as TestWindow).__player!.play())
  await expect.poll(() => index(page)).toBe(5)
})

test('Auto aus: nach 8 s wählt der Agent nicht', async ({ page }) => {
  test.setTimeout(30000)
  await startAt(page, { card: 'wetter', at: 4, query: '&auto=1' })
  await page.evaluate(() => (window as unknown as { __player: { setAuto(a: boolean): void } }).__player.setAuto(false))
  await page.waitForTimeout(9500)
  await expect(page.locator('.quizkarte[data-agent=true]')).toHaveCount(0)
  expect(await index(page)).toBe(4)
})

test('reduzierte Bewegung: in allen vier Stationen nur Überblendungen, nie ein Transform', async ({ browser }) => {
  test.setTimeout(40000)
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/?test=1&fixtures=1&motion=1')
  await page.getByRole('textbox').fill('zzfix')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TestWindow).__player, undefined, { timeout: 10000 })
  await page.evaluate(() => {
    const w = window as unknown as { __bad: string[]; __seen: Record<string, boolean> }
    w.__bad = []
    w.__seen = {}
    const sel = '.stage, .erzaehl, .wn, .wn-satz, .wortkarte, .plankarte, .plan-nr, .notiz, .schublade, .schublade .lade, .quizkarte, .quiz, .orb-hop, .gedankenwolke .weg'
    const ident = (t: string) => t === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t)
    const loop = () => {
      document.querySelectorAll<Element>(sel).forEach((e) => {
        const cs = getComputedStyle(e)
        const key = e.className && typeof e.className === 'string' ? e.className.split(' ')[0] : e.tagName
        if (Number(cs.opacity) < 1) w.__seen[key] = true
        if (!ident(cs.transform) || (cs.rotate !== 'none' && cs.rotate !== '0deg') || (cs.scale !== 'none' && cs.scale !== '1'))
          w.__bad.push(key + ':' + cs.transform)
        const dash = (e as SVGElement).style?.strokeDashoffset
        if (dash && dash !== '0' && dash !== '0px') w.__bad.push(key + ':dash')
      })
      requestAnimationFrame(loop)
    }
    loop()
  })
  for (const i of [1, 2, 3, 4]) {
    await goTo(page, i)
    await page.waitForTimeout(1000)
  }
  const r = await page.evaluate(() => {
    const w = window as unknown as { __bad: string[]; __seen: Record<string, boolean> }
    return { bad: [...new Set(w.__bad)], seen: Object.keys(w.__seen) }
  })
  expect(r.bad).toEqual([])
  expect(r.seen).toEqual(expect.arrayContaining(['wortkarte', 'plankarte', 'quizkarte']))
  await ctx.close()
})
