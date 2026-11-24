import { test, expect, type Page } from '@playwright/test'

type TW = {
  __player?: { index: number; state: string; tempo: number; paused: boolean; goTo(i: number): void; next(): void; prev(): void }
  __events?: { type: string; [k: string]: unknown }[]
}

/** Startet einen Ablauf per Eingabe (Stichwort aus den Testabläufen) und wartet, bis der Player läuft. */
async function begin(page: Page, eingabe: string, query = '') {
  await page.goto(`/?test=1&fixtures=1${query}`)
  await page.getByRole('textbox').fill(eingabe)
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await settled(page)
}

async function settled(page: Page) {
  await expect.poll(() => state(page)).toMatch(/^(playing|quiz|paused|done)$/)
}
const state = (page: Page) => page.evaluate(() => (window as unknown as TW).__player!.state)
const index = (page: Page) => page.evaluate(() => (window as unknown as TW).__player!.index)

async function goTo(page: Page, i: number) {
  await page.evaluate((n) => (window as unknown as TW).__player!.goTo(n), i)
  await expect.poll(() => index(page)).toBe(i)
  await settled(page)
}

const matrixScale = (page: Page) =>
  page.evaluate(() => {
    const b = document.querySelector('[data-slot=buehne]')!
    const t = getComputedStyle(b).transform
    return t === 'none' ? 1 : new DOMMatrix(t).a
  })

test('Steuerung gibt es erst im Ablauf, der Themenschalter schon auf dem Startbildschirm', async ({ page }) => {
  await page.goto('/?test=1&fixtures=1')
  await expect(page.locator('[data-action=theme]')).toBeVisible()
  await expect(page.locator('.controls')).toHaveCount(0)
  await expect(page.locator('.progress')).toHaveCount(0)
  await page.getByRole('textbox').fill('zzsuche')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await expect(page.locator('.controls [data-action=theme]')).toHaveCount(1)
  await expect(page.locator('[data-action=theme]')).toHaveCount(1)
  await expect(page.locator('[data-slot=text]')).toHaveAttribute('aria-live', 'polite')
})

test('nach dem Start sitzt der Fokus auf Pause', async ({ page }) => {
  await begin(page, 'zzsuche')
  await expect(page.locator('[data-action=pause]')).toBeFocused()
})

test('Tastatur: Leertaste pausiert und setzt fort, Pfeile wechseln den Schritt', async ({ page }) => {
  await begin(page, 'zzsuche')
  await page.keyboard.press('Space') // Fokus auf Pause: der Knopf selbst
  await expect.poll(() => state(page)).toBe('paused')
  await page.keyboard.press('Space')
  await expect.poll(() => state(page)).toBe('playing')
  // Fokus nirgends: die Leertaste gilt für die Seite und scrollt nicht
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Space')
  await expect.poll(() => state(page)).toBe('paused')
  await page.keyboard.press('Space')
  await expect.poll(() => state(page)).toBe('playing')
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => index(page)).toBe(1)
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => index(page)).toBe(2)
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => index(page)).toBe(1)
})

test('Tastatur: im Textfeld und auf einer Quizkarte bleiben die Tasten unberührt', async ({ page }) => {
  await page.goto('/?test=1&fixtures=1')
  await page.getByRole('textbox').focus()
  await page.keyboard.type('zz suche')
  expect(await page.getByRole('textbox').inputValue()).toBe('zz suche')
  await page.getByRole('textbox').fill('zzsuche')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await goTo(page, 4) // Mitmach-Frage
  await expect.poll(() => state(page)).toBe('quiz')
  await page.locator('.quizkarte').first().focus()
  await page.keyboard.press('Space') // wählt die Karte, pausiert nicht
  await expect.poll(() => state(page)).not.toBe('paused')
})

test('jeder Knopf ist per Tab erreichbar und hat einen sichtbaren Fokusrahmen', async ({ page }) => {
  await begin(page, 'zztief')
  await goTo(page, 1)
  const seen = new Set<string>()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const r = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement
      const cs = getComputedStyle(e)
      return { key: e.dataset.action ?? (e.dataset.dot ? 'dot' : e.tagName), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }
    })
    if (r.key === 'BODY') continue // der Fokus hat die Seite einmal umrundet
    seen.add(r.key)
    expect(r.style, r.key).not.toBe('none')
    expect(r.width, r.key).toBeGreaterThanOrEqual(2)
  }
  for (const k of ['back', 'pause', 'next', 'tempo', 'sound', 'theme', 'tiefer', 'dot']) expect(seen, k).toContain(k)
})

test('Tempo-Knopf wechselt 1× → 1,5× → 0,75× → 1× und zeigt den Wert', async ({ page }) => {
  await begin(page, 'zzsuche')
  const b = page.locator('[data-action=tempo]')
  await expect(b).toContainText('1×')
  await b.click()
  await expect(b).toContainText('1,5×')
  expect(await page.evaluate(() => (window as unknown as TW).__player!.tempo)).toBe(1.5)
  await b.click()
  await expect(b).toContainText('0,75×')
  await b.click()
  await expect(b).toContainText('1×')
})

test('Ton-Knopf schaltet um und merkt sich die Wahl', async ({ page }) => {
  await begin(page, 'zzsuche')
  const b = page.locator('[data-action=sound]')
  await expect(b).toHaveAttribute('aria-pressed', 'false')
  await b.click()
  await expect(b).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await page.getByRole('textbox').fill('zzsuche')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player)
  await expect(page.locator('[data-action=sound]')).toHaveAttribute('aria-pressed', 'true')
})

test('Fortschrittsleiste: ein Punkt pro Schritt, kurze Schritte kleiner, Klick springt', async ({ page }) => {
  await begin(page, 'zzschleife')
  await expect(page.locator('.progress [data-dot]')).toHaveCount(13)
  const w = (i: number) =>
    page.locator(`.progress [data-dot="${i}"] .dot`).evaluate((e) => e.getBoundingClientRect().width)
  expect(await w(3)).toBeLessThan(await w(2)) // planung ist kurz
  await page.locator('.progress [data-dot="6"]').click()
  await expect.poll(() => index(page)).toBe(6)
  await expect(page.locator('.progress [data-dot="6"]')).toHaveAttribute('aria-current', 'step')
  await page.locator('.progress [data-dot="1"]').click()
  await expect.poll(() => index(page)).toBe(1)
})

test('Tiefer graben: Bühne ≤ 0,7 und sichtbar, Player pausiert, Esc schließt und setzt fort', async ({ page }) => {
  await begin(page, 'zztief')
  await goTo(page, 1)
  await expect.poll(() => state(page)).toBe('playing')
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  await expect.poll(() => state(page)).toBe('paused')
  expect(await matrixScale(page)).toBeLessThanOrEqual(0.7)
  const r = await page.locator('[data-slot=buehne]').boundingBox()
  expect(r!.width).toBeGreaterThan(20)
  expect(await page.locator('[data-slot=buehne]').evaluate((e) => getComputedStyle(e).opacity)).toBe('1')
  // Die Detail-Ebene scrollt innen, die Seite nie.
  const m = await page.evaluate(() => {
    const d = document.querySelector('.detail') as HTMLElement
    return { inner: d.scrollHeight > d.clientHeight, oy: getComputedStyle(d).overflowY, sh: document.scrollingElement!.scrollHeight, ih: innerHeight }
  })
  expect(m.inner).toBe(true)
  expect(m.oy).toBe('auto')
  expect(m.sh).toBeLessThanOrEqual(m.ih)
  await page.keyboard.press('Escape')
  await expect(page.locator('.detail')).toHaveCount(0)
  await expect.poll(() => state(page)).toBe('playing')
  expect(await matrixScale(page)).toBe(1)
  await expect(page.locator('[data-action=tiefer]')).toBeFocused()
})

test('Tiefer graben: war der Player pausiert, bleibt er nach dem Schließen pausiert', async ({ page }) => {
  await begin(page, 'zztief')
  await goTo(page, 1)
  await page.locator('[data-action=pause]').click()
  await expect.poll(() => state(page)).toBe('paused')
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.detail')).toHaveCount(0)
  expect(await state(page)).toBe('paused')
})

test('Tiefer graben: Klick neben die Ebene schließt sie', async ({ page }) => {
  await begin(page, 'zztief')
  await goTo(page, 1)
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  await page.mouse.click(2, 2)
  await expect(page.locator('.detail')).toHaveCount(0)
  // ein Klick in die Ebene selbst schließt nicht
  await page.locator('[data-action=tiefer]').click()
  await page.locator('.detail').click({ position: { x: 20, y: 20 } })
  await expect(page.locator('.detail')).toBeVisible()
  await page.locator('.detail [data-action=close]').click()
  await expect(page.locator('.detail')).toHaveCount(0)
})

test('Tiefer graben: der Fokus bleibt in der Ebene gefangen', async ({ page }) => {
  await begin(page, 'zztief')
  await goTo(page, 1)
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 ? 'Tab' : 'Shift+Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('.detail'))).toBe(true)
  }
})

test('Tiefer graben bei reduzierter Bewegung: überblenden, nicht skalieren', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await begin(page, 'zztief')
  await goTo(page, 1)
  await page.locator('[data-action=tiefer]').click()
  await expect(page.locator('.detail')).toBeVisible()
  expect(await matrixScale(page)).toBe(1)
  expect(await page.locator('[data-slot=buehne]').boundingBox()).not.toBeNull()
})

test('Tiefer graben ist ohne Zusatztext deaktiviert', async ({ page }) => {
  await begin(page, 'zztief')
  await goTo(page, 0)
  await expect(page.locator('[data-action=tiefer]')).toBeDisabled()
})

test('Am Ende: Nochmal und Nächster Ablauf erscheinen; Nochmal startet bei Schritt 0, dreimal ohne Doppel', async ({ page }) => {
  await begin(page, 'zzsuche')
  await expect(page.locator('[data-action=nochmal]')).not.toBeVisible()
  for (let k = 1; k <= 3; k++) {
    await goTo(page, 7)
    await page.evaluate(() => (window as unknown as TW).__player!.next())
    await expect.poll(() => state(page)).toBe('done')
    await expect(page.locator('[data-action=nochmal]')).toBeVisible()
    await page.locator('[data-action=nochmal]').click()
    await expect.poll(() => index(page)).toBe(0)
    await settled(page)
    await expect(page.locator('[data-action=pause]')).toBeFocused()
    const zero = await page.evaluate(
      () => (window as unknown as TW).__events!.filter((e) => e.type === 'step' && e.index === 0).length,
    )
    expect(zero).toBe(k + 1)
    await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
    await expect(page.locator('.controls')).toHaveCount(1)
    await expect(page.locator('.progress')).toHaveCount(1)
  }
  // genau ein Schrittereignis pro Eintritt
  const before = await page.evaluate(() => (window as unknown as TW).__events!.filter((e) => e.type === 'step').length)
  await page.evaluate(() => (window as unknown as TW).__player!.next())
  await expect.poll(() => index(page)).toBe(1)
  await page.waitForTimeout(150)
  const after = await page.evaluate(() => (window as unknown as TW).__events!.filter((e) => e.type === 'step').length)
  expect(after - before).toBe(1)
})

test('Nächster Ablauf führt zurück zum Startbildschirm, ein neuer Ablauf startet sauber', async ({ page }) => {
  await begin(page, 'zzsuche')
  await goTo(page, 7)
  await page.evaluate(() => (window as unknown as TW).__player!.next())
  await expect.poll(() => state(page)).toBe('done')
  await page.locator('[data-action=weiter-ablauf]').click()
  await expect(page.getByRole('heading', { name: 'Deine Aufgabe' })).toBeVisible()
  await expect(page.locator('.controls')).toHaveCount(0)
  await expect(page.locator('[data-action=theme]')).toHaveCount(1)
  await expect(page.locator('.chatblase')).toHaveCount(0)
  await page.getByRole('textbox').fill('zzapi')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TW).__player && (window as unknown as TW).__player!.state !== 'done')
  await settled(page)
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
  await expect(page.locator('.controls')).toHaveCount(1)
})

test('Themenschalter in der Steuerleiste funktioniert im Ablauf', async ({ page }) => {
  await begin(page, 'zzsuche')
  const before = await page.locator('html').getAttribute('data-theme')
  await page.locator('.controls [data-action=theme]').click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before!)
})

for (const v of [
  { w: 320, h: 568 },
  { w: 1024, h: 768 },
  { w: 1920, h: 1080 },
]) {
  test(`${v.w}x${v.h}: Chat-Blase überlappt die Steuerung nicht, kein Scroll`, async ({ page }) => {
    await page.setViewportSize({ width: v.w, height: v.h })
    await begin(page, 'zzsuche')
    await goTo(page, 7)
    await expect(page.locator('.chatblase')).toBeVisible()
    await page.evaluate(() => (window as unknown as TW).__player!.next()) // done: Nochmal-Ebene
    await expect.poll(() => state(page)).toBe('done')
    const m = await page.evaluate(() => {
      const a = document.querySelector('.chatblase')!.getBoundingClientRect()
      const b = document.querySelector('[data-slot=steuerung]')!.getBoundingClientRect()
      const se = document.scrollingElement!
      return { aBottom: a.bottom, bTop: b.top, bBottom: b.bottom, sh: se.scrollHeight, ih: innerHeight, sw: se.scrollWidth, iw: innerWidth }
    })
    expect(m.aBottom).toBeLessThanOrEqual(m.bTop + 0.5)
    expect(m.bBottom).toBeLessThanOrEqual(m.ih + 0.5)
    expect(m.sh).toBeLessThanOrEqual(m.ih)
    expect(m.sw).toBeLessThanOrEqual(m.iw)
  })
}

test('320x568: alle Steuerknöpfe passen ins Bild und überlappen sich nicht', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await begin(page, 'zztief')
  await goTo(page, 1)
  const m = await page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.controls button, .progress button')].filter((e) => e.getBoundingClientRect().width > 0)
    const rs = els.map((e) => e.getBoundingClientRect())
    let overlap = 0
    for (let i = 0; i < rs.length; i++)
      for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i], b = rs[j]
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlap++
      }
    return { n: rs.length, overlap, out: rs.filter((r) => r.left < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5).length }
  })
  expect(m.n).toBeGreaterThan(8)
  expect(m.overlap).toBe(0)
  expect(m.out).toBe(0)
})
