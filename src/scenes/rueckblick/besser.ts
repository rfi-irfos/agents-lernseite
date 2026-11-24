import { gsap } from 'gsap'
import { de } from '../../content/de'
import { el } from '../common'
import type { PartCtx, PartHandle } from './types'

export type Verlauf = 'besser' | 'gleich' | 'schlechter'

/** Zabihs Verläufe (Abschnitt 4): Qualität 0 bis 100 je Runde. */
export const VERLAEUFE: Record<Verlauf, number[]> = {
  besser: [40, 55, 68, 78, 86, 92],
  gleich: [50, 50, 51, 50, 49, 50],
  schlechter: [60, 52, 44, 35, 27, 20],
}
const ORDER: Verlauf[] = ['besser', 'gleich', 'schlechter']
const X0 = 44
const DX = 50
const yOf = (v: number) => 150 - v * 1.2
const NS = 'http://www.w3.org/2000/svg'

/** Pfaddaten einer Linie: gleiche Punktzahl, damit sich zwei Verläufe stufenlos ineinander überführen lassen. */
export const pathFor = (vals: number[]): string =>
  vals.map((v, i) => `${i ? 'L' : 'M'}${(X0 + i * DX).toFixed(2)} ${yOf(v).toFixed(2)}`).join(' ')

export function besser(c: PartCtx): PartHandle {
  const t = de.rueckblick.besser
  const n = VERLAEUFE.besser.length
  const cur = VERLAEUFE.besser.slice()

  const wrap = el('div', 'rb-besser')
  let grid = ''
  for (const v of [0, 50, 100]) {
    grid += `<line x1="${X0}" x2="${X0 + (n - 1) * DX}" y1="${yOf(v)}" y2="${yOf(v)}" class="rb-grid"/><text x="${X0 - 8}" y="${yOf(v) + 4}" text-anchor="end" class="rb-tick">${v}</text>`
  }
  for (let i = 0; i < n; i++) grid += `<text x="${X0 + i * DX}" y="170" text-anchor="middle" class="rb-tick">${i + 1}</text>`
  const svgEl = document.createElementNS(NS, 'svg')
  svgEl.setAttribute('viewBox', '0 0 320 190')
  svgEl.setAttribute('class', 'rb-chart')
  svgEl.setAttribute('role', 'img')
  svgEl.setAttribute('aria-label', t.chartLabel)
  svgEl.dataset.curve = 'besser'
  svgEl.innerHTML = `${grid}
    <text x="4" y="16" class="rb-achse">${t.achseY}</text>
    <text x="${X0 + ((n - 1) * DX) / 2}" y="186" text-anchor="middle" class="rb-achse">${t.achseX}</text>
    <g class="rb-daten"><path class="rb-line" d="${pathFor(cur)}"/>${cur.map(() => '<circle class="rb-punkt" r="5"/>').join('')}</g>`
  const line = svgEl.querySelector<SVGPathElement>('.rb-line')!
  const dots = Array.from(svgEl.querySelectorAll<SVGCircleElement>('.rb-punkt'))
  const daten = svgEl.querySelector<SVGGElement>('.rb-daten')!
  const draw = () => {
    line.setAttribute('d', pathFor(cur))
    dots.forEach((d, i) => {
      d.setAttribute('cx', String(X0 + i * DX))
      d.setAttribute('cy', yOf(cur[i]).toFixed(2))
    })
  }
  draw()

  const satz = el('p', 'rb-satz')
  satz.setAttribute('role', 'status')
  satz.textContent = t.verlaeufe.besser.satz
  const group = el('div', 'rb-opts')
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', t.gruppe)
  const buttons = new Map<Verlauf, HTMLButtonElement>()
  for (const k of ORDER) {
    const b = el('button', 'glass rb-opt')
    b.type = 'button'
    b.dataset.curve = k
    b.setAttribute('aria-pressed', String(k === 'besser'))
    b.innerHTML = `<span class="rb-swatch" aria-hidden="true"></span><span>${t.verlaeufe[k].label}</span>`
    buttons.set(k, b)
    group.append(b)
  }
  wrap.append(svgEl, satz, group)
  c.stage.append(wrap)

  const merke = el('p', 'rb-merke')
  const strong = el('strong')
  strong.textContent = t.merke
  merke.append(strong, ` ${t.merksatz}`)
  c.text.append(merke)
  if (c.weiter) {
    const w = el('button', 'glass rb-weiter')
    w.type = 'button'
    w.dataset.action = 'rb-weiter'
    w.textContent = de.rueckblick.weiter
    w.addEventListener('click', () => c.weiter?.())
    group.append(w)
  }

  let tween: gsap.core.Tween | undefined
  let active: Verlauf = 'besser'
  const show = (k: Verlauf) => {
    if (k === active) return
    active = k
    buttons.forEach((b, key) => b.setAttribute('aria-pressed', String(key === k)))
    svgEl.dataset.curve = k
    satz.textContent = t.verlaeufe[k].satz
    tween?.kill()
    const to = VERLAEUFE[k]
    if (c.reduced) {
      // nur überblenden, ≤ 200 ms
      tween = gsap.to(daten, {
        opacity: 0,
        duration: c.d(0.1),
        onComplete: () => {
          cur.splice(0, n, ...to)
          draw()
          tween = gsap.to(daten, { opacity: 1, duration: c.d(0.1) })
        },
      })
      return
    }
    const from = cur.slice()
    const p = { f: 0 }
    tween = gsap.to(p, {
      f: 1,
      duration: c.d(0.8),
      ease: 'power2.inOut',
      onUpdate: () => {
        for (let i = 0; i < n; i++) cur[i] = from[i] + (to[i] - from[i]) * p.f
        draw()
      },
      onComplete: () => {
        cur.splice(0, n, ...to)
        draw()
      },
    })
  }
  buttons.forEach((b, k) => b.addEventListener('click', () => show(k)))

  return { kill: () => tween?.kill(), focus: () => buttons.get('besser')?.focus({ preventScroll: true }) }
}
