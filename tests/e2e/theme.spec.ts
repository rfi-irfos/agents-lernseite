import { test, expect, type Page } from '@playwright/test'

type RGBA = [number, number, number, number]

function parse(c: string): RGBA {
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) throw new Error('Farbe nicht lesbar: ' + c)
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
}
function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3]
  return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1) as RGBA
}
function lum([r, g, b]: RGBA): number {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function contrast(a: RGBA, b: RGBA): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

async function bodyBg(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor)
}

test('helles Thema ist Standard bei colorScheme light', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto('/')
  expect(await bodyBg(page)).toBe('rgb(244, 246, 250)')
  await ctx.close()
})

test('dunkles Thema bei colorScheme dark', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' })
  const page = await ctx.newPage()
  await page.goto('/')
  expect(await bodyBg(page)).toBe('rgb(7, 12, 25)')
  await ctx.close()
})

test('Schalter kippt das Thema und überlebt ein Neuladen', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.locator('[data-action=theme]').click()
  await expect.poll(() => bodyBg(page)).toBe('rgb(7, 12, 25)')
  await page.reload()
  expect(await bodyBg(page)).toBe('rgb(7, 12, 25)')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('[data-action=theme]').click()
  await expect.poll(() => bodyBg(page)).toBe('rgb(244, 246, 250)')
  await ctx.close()
})

for (const scheme of ['light', 'dark'] as const) {
  test(`Kontrast AA in ${scheme}`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme })
    const page = await ctx.newPage()
    await page.goto('/')
    const items = await page.$$eval('[data-contrast-check]', (els) => {
      // Hintergründe von innen nach außen sammeln
      return els.map((el) => {
        const bgs: string[] = []
        for (let n: Element | null = el; n; n = n.parentElement) bgs.push(getComputedStyle(n).backgroundColor)
        return { name: el.tagName + ':' + (el.textContent ?? '').trim().slice(0, 20), color: getComputedStyle(el).color, bgs }
      })
    })
    expect(items.length).toBeGreaterThanOrEqual(2)
    for (const it of items) {
      let bg: RGBA = [255, 255, 255, 1]
      for (const c of [...it.bgs].reverse()) bg = over(parse(c), bg)
      const fg = over(parse(it.color), bg)
      expect(contrast(fg, bg), it.name).toBeGreaterThanOrEqual(4.5)
    }
    await ctx.close()
  })
}
