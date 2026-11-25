import { test, expect, type Page } from '@playwright/test'

type TestWindow = {
  __player?: { index: number; state: string; goTo(i: number): void; next(): void }
  __events?: { type: string; [k: string]: unknown }[]
}

async function startAt(page: Page, opts: { eingabe: string; at: number; query?: string }) {
  await page.goto(`/?test=1&fixtures=1${opts.query ?? ''}`)
  await page.getByRole('textbox').fill(opts.eingabe)
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TestWindow).__player)
  await goTo(page, opts.at)
}

async function goTo(page: Page, i: number) {
  await page.evaluate((n) => (window as unknown as TestWindow).__player!.goTo(n), i)
  await expect.poll(() => page.evaluate(() => (window as unknown as TestWindow).__player!.index)).toBe(i)
}

const HANDELN = 5

test('Handeln suche: Treffer fliegen herein', async ({ page }) => {
  await startAt(page, { eingabe: 'zzsuche', at: HANDELN })
  await expect(page.locator('.treffer')).toHaveCount(3)
  await expect(page.locator('.treffer').first()).toContainText('Erster Treffer')
  await expect(page.locator('[data-slot=text] .erzaehl')).toHaveCount(1)
})

test('Handeln api: Anfrage und Antwortkarte', async ({ page }) => {
  await startAt(page, { eingabe: 'zzapi', at: HANDELN })
  await expect(page.locator('.antwortkarte')).toContainText('Morgen regnet es.')
  await expect(page.locator('.anfragekarte')).toContainText('Wetterdienst')
})

test('Handeln code: Terminal tippt, Testlauf ist im ersten Durchlauf rot, im zweiten grün', async ({ page }) => {
  await startAt(page, { eingabe: 'zzcode', at: HANDELN })
  await expect(page.locator('.terminal')).toBeVisible()
  await expect(page.locator('.terminal')).toContainText('def sortiere(liste):')
  await expect(page.locator('.testlauf')).toHaveAttribute('data-status', 'rot')
  await expect(page.locator('.testlauf')).toContainText('fehlgeschlagen')
  await goTo(page, 10) // handeln, zweiter Durchlauf
  await expect(page.locator('.knoten.aktiv .terminal')).toContainText('sorted(liste)')
  await expect(page.locator('.testlauf')).toHaveAttribute('data-status', 'gruen')
  await expect(page.locator('.testlauf')).toContainText('bestanden')
})

test('Handeln code: das Terminal tippt zeichenweise', async ({ page }) => {
  await startAt(page, { eingabe: 'zzcode', at: 4, query: '&motion=1' })
  await goTo(page, HANDELN)
  const lens: number[] = []
  for (let i = 0; i < 12; i++) {
    lens.push(await page.evaluate(() => (document.querySelector('.terminal')?.textContent ?? '').length))
    await page.waitForTimeout(150)
  }
  const distinct = [...new Set(lens)]
  expect(distinct.length).toBeGreaterThan(3)
  expect(lens).toEqual([...lens].sort((a, b) => a - b)) // wächst nur
})

test('Handeln bild: Abtastlinie, Markierungen, lokales Bild', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost')) external.push(r.url())
  })
  await startAt(page, { eingabe: 'zzbild', at: HANDELN })
  await expect(page.locator('.abtastlinie')).toHaveCount(1)
  await expect(page.locator('.markierung')).toHaveCount(2)
  await expect(page.locator('.bildrahmen svg')).toBeVisible()
  expect(external).toEqual([])
})

test('Handeln planung: Routenpunkte mit Ort und Zeit', async ({ page }) => {
  await startAt(page, { eingabe: 'zzplanung', at: HANDELN })
  const pts = page.locator('.routenpunkt')
  await expect(pts).toHaveCount(3)
  await expect(pts.nth(1)).toContainText('Semmering')
  await expect(pts.nth(1)).toContainText('09:30')
})

test('Prüfen ohne Schleife: Haken, kein Rückflug', async ({ page }) => {
  await startAt(page, { eingabe: 'zzsuche', at: 6 })
  await expect(page.locator('.haken')).toBeVisible()
  await expect(page.locator('.knoten.aktiv .schleifengrund')).toHaveCount(0)
  await expect(page.locator('.orb-rueck')).toHaveCount(0)
})

test('Prüfen mit Schleife: Grund steht da, Kugel fliegt zurück zu Denken, dann step pass 2', async ({ page }) => {
  test.setTimeout(30000)
  await startAt(page, { eingabe: 'zzschleife', at: 4, query: '&motion=1' })
  await goTo(page, 6)
  await expect(page.locator('.schleifengrund')).toContainText('Die Antwort sagt nichts zum Schirm')
  await expect(page.locator('.ziel-denken')).toBeVisible()
  const xs: number[] = []
  for (let i = 0; i < 20; i++) {
    const x = await page.evaluate(() => document.querySelector('.orb-rueck')?.getBoundingClientRect().left ?? NaN)
    if (!Number.isNaN(x)) xs.push(x)
    await page.waitForTimeout(150)
  }
  expect(xs.length).toBeGreaterThan(5)
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(40) // sichtbarer Flug
  const orbX = xs[xs.length - 1]
  const zielX = await page.evaluate(() => {
    const r = document.querySelector('.ziel-denken')!.getBoundingClientRect()
    return r.left + r.width / 2
  })
  expect(Math.abs(orbX - zielX)).toBeLessThan(60) // landet bei Denken
  await page.evaluate(() => (window as unknown as TestWindow).__player!.next())
  await expect
    .poll(() => page.evaluate(() => (window as unknown as TestWindow).__events!.some((e) => e.type === 'step' && e.index === 7 && e.pass === 2)))
    .toBe(true)
  await goTo(page, 11) // Prüfen im zweiten Durchlauf bestätigt
  await expect(page.locator('.haken')).toBeVisible()
  await expect(page.locator('.knoten.aktiv .schleifengrund')).toHaveCount(0)
})

test('step-Ereignis trägt pass', async ({ page }) => {
  await startAt(page, { eingabe: 'zzschleife', at: 0 })
  await goTo(page, 6)
  await goTo(page, 7)
  const ev = await page.evaluate(() => (window as unknown as TestWindow).__events!.filter((e) => e.type === 'step'))
  expect(ev.find((e) => e.index === 6)).toMatchObject({ pass: 1 })
  expect(ev.find((e) => e.index === 7)).toMatchObject({ pass: 2 })
})

test('Ergebnis: Chatblase sitzt am Platz des Eingabefelds, danach das Auftauchen', async ({ page }) => {
  await startAt(page, { eingabe: 'zzsuche', at: 6 })
  const slot = await page.evaluate(() => {
    const r = document.querySelector('[data-slot=eingabe]')!.getBoundingClientRect()
    return { x: r.left, y: r.top }
  })
  await goTo(page, 7)
  const bubble = page.locator('.chatblase')
  await expect(bubble).toBeVisible()
  await expect(bubble).toContainText('Antwort fix-suche: Das ist das fertige Ergebnis für dich.')
  await expect(bubble).not.toContainText('Hier steht die fertige Antwort für dich.')
  // genau eine Ansage: Statusbereich mit der Antwort als Text, ohne zusätzliches aria-label
  await expect(bubble).toHaveAttribute('role', 'status')
  await expect(bubble).not.toHaveAttribute('aria-label', /.+/)
  await expect(page.locator('[role=status]', { hasText: 'Das ist das fertige Ergebnis für dich.' })).toHaveCount(1)
  const b = await bubble.evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { x: r.left, y: r.top }
  })
  expect(Math.abs(b.x - slot.x)).toBeLessThanOrEqual(24)
  expect(Math.abs(b.y - slot.y)).toBeLessThanOrEqual(24)
  await expect
    .poll(() => page.evaluate(() => (window as unknown as TestWindow).__events!.some((e) => e.type === 'auftauchen')))
    .toBe(true)
  await goTo(page, 6)
  await expect(page.locator('.chatblase')).toHaveCount(0)
})

test('Ergebnis: Chatblase bleibt auch auf dem schmalen Telefon im Bild', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await startAt(page, { eingabe: 'zzsuche', at: 7 })
  const r = await page.locator('.chatblase').evaluate((e) => {
    const q = e.getBoundingClientRect()
    return { l: q.left, r: q.right, b: q.bottom, w: innerWidth, h: innerHeight }
  })
  expect(r.l).toBeGreaterThanOrEqual(-1)
  expect(r.r).toBeLessThanOrEqual(r.w + 1)
  expect(r.b).toBeLessThanOrEqual(r.h + 1)
})

test('reduzierte Bewegung: Handeln, Prüfen und Ergebnis blenden nur über, nie ein Transform', async ({ browser }) => {
  test.setTimeout(60000)
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/?test=1&fixtures=1&motion=1')
  await page.getByRole('textbox').fill('zzschleife')
  await page.getByRole('button', { name: 'Ablauf starten' }).click()
  await page.waitForFunction(() => !!(window as unknown as TestWindow).__player, undefined, { timeout: 10000 })
  await page.evaluate(() => {
    const w = window as unknown as { __bad: string[]; __seen: Record<string, boolean> }
    w.__bad = []
    w.__seen = {}
    const sel = [
      '.stage', '.erzaehl', '.anfragekarte', '.antwortkarte', '.terminal', '.terminal-zeile', '.testlauf', '.treffer', '.abtastlinie',
      '.markierung', '.routenpunkt', '.route-linie', '.haken', '.haken path', '.orb-rueck', '.ziel-denken', '.schleifengrund',
      '.chatblase', '.fertig',
    ].join(', ')
    const ident = (t: string) => t === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t)
    const loop = () => {
      document.querySelectorAll<Element>(sel).forEach((e) => {
        const cs = getComputedStyle(e)
        const key = typeof e.className === 'string' && e.className ? e.className.split(' ')[0] : e.tagName
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
  for (const i of [5, 6, 12]) {
    await goTo(page, i)
    await page.waitForTimeout(1200)
  }
  const r = await page.evaluate(() => {
    const w = window as unknown as { __bad: string[]; __seen: Record<string, boolean> }
    return { bad: [...new Set(w.__bad)], seen: Object.keys(w.__seen) }
  })
  expect(r.bad).toEqual([])
  expect(r.seen).toEqual(expect.arrayContaining(['chatblase']))
  await ctx.close()
})
