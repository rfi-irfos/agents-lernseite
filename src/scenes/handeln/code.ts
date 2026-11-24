import { gsap } from 'gsap'
import { de } from '../../content/de'
import { parseHandelnDaten } from '../../engine/handeln'
import { d, el, orbHop, startScene, svgBox, tv } from '../common'
import { svgRaw } from '../svg'
import type { SceneBuilder } from '../types'

const SECONDS_PER_CHAR = 0.03

/** Terminal tippt Zeile für Zeile (zeichenweise, GSAP steps()), dann läuft der Test: rot im ersten, grün im zweiten Durchlauf. */
export const code: SceneBuilder = (ctx) => {
  const { tl, stage } = startScene(ctx)
  const daten = parseHandelnDaten('code', ctx.step.script.daten)
  if (!daten) {
    orbHop(ctx, stage, tl)
    return tl
  }
  // Im ersten Durchlauf eines Ablaufs mit Schleife fällt der Test durch, erst im zweiten wird er grün.
  const ok = daten.test.ok && !(ctx.step.pass === 1 && ctx.scenario.schleife)

  const wrap = el('div', 'code')
  const term = el('div', 'terminal')
  const kopf = el('div', 'terminal-kopf')
  const name = el('span')
  name.textContent = de.stationen.terminal
  kopf.append(svgBox(svgRaw('terminal'), 'terminal-icon'), name)
  const body = el('pre', 'terminal-text')
  const lines = daten.zeilen.map((z) => {
    const l = el('span', 'terminal-zeile')
    l.textContent = ctx.reduced ? z : ''
    body.append(l, document.createTextNode('\n'))
    return { l, z }
  })
  term.append(kopf, body)

  const test = el('div', 'testlauf')
  test.dataset.status = ok ? 'gruen' : 'rot'
  test.setAttribute('role', 'status')
  const mark = el('span', 'testmarke')
  mark.setAttribute('aria-hidden', 'true')
  mark.innerHTML = ok
    ? '<svg viewBox="0 0 24 24"><path class="g-acc" d="M5 12l5 5 9-10"/></svg>'
    : '<svg viewBox="0 0 24 24"><path class="g-acc" d="M6 6l12 12M18 6L6 18"/></svg>'
  const label = el('span')
  label.textContent = `${de.stationen.testlauf} ${daten.test.name}: ${ok ? de.stationen.bestanden : de.stationen.fehlgeschlagen}`
  test.append(mark, label)

  wrap.append(term, test)
  stage.append(wrap)
  gsap.set(test, { opacity: 0 })

  if (ctx.reduced) {
    // keine Tipp-Bewegung: der Text blendet auf einmal ein
    gsap.set(body, { opacity: 0 })
    tl.to(body, { opacity: 1, duration: d(ctx, 0.2) }, 'handlung')
  } else {
    lines.forEach(({ l, z }) => {
      const n = Array.from(z).length
      const chars = Array.from(z)
      const proxy = { n: 0 }
      const set = () => {
        l.textContent = chars.slice(0, Math.round(proxy.n)).join('')
      }
      tl.to(proxy, {
        n,
        duration: d(ctx, Math.max(0.25, n * SECONDS_PER_CHAR)),
        ease: `steps(${Math.max(1, n)})`,
        onUpdate: set,
        onComplete: () => {
          l.textContent = z
        },
      })
    })
  }
  tl.to(test, tv(ctx, { opacity: 1, duration: d(ctx, 0.4) }), `+=${d(ctx, 0.3)}`)
  return tl
}
