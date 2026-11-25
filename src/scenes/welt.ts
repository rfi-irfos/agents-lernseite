import { gsap } from 'gsap'
import { de } from '../content/de'
import { dur } from '../env'
import type { Step } from '../engine/steps'

const EASE = 'power2.inOut'
const NS = 'http://www.w3.org/2000/svg'

export interface Welt {
  el: HTMLElement
  /** Neue Station: Titel wechselt, die Kugel fliegt in die Mitte, holt die alte Szene ab und bringt die neue. */
  zeige(step: Step, index: number, total: number, erster: boolean): void
  /** Ablauf zu Ende: der Titel geht, Schein und Ringe bleiben für den Rückblick. */
  ruhe(): void
  weg(): void
}

function ringe(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 200 200')
  svg.setAttribute('class', 'welt-ringe')
  for (const [r, dash, cls] of [
    [46, '0.4 3', 'ring-a'],
    [64, '60 8 4 8', 'ring-b'],
    [82, '0.4 5', 'ring-c'],
    [98, '90 14', 'ring-b'],
  ] as const) {
    const g = document.createElementNS(NS, 'g')
    g.setAttribute('class', cls)
    const c = document.createElementNS(NS, 'circle')
    c.setAttribute('cx', '100')
    c.setAttribute('cy', '100')
    c.setAttribute('r', String(r))
    c.setAttribute('stroke-dasharray', dash)
    g.append(c)
    svg.append(g)
  }
  return svg
}

/**
 * Die Welt hinter den Stationen: Farbschein, kreisende Ringe, Stationstitel und die Daten-Kugel.
 * Sie bleibt über alle Stationen stehen, damit der Ablauf wie eine einzige Fahrt wirkt.
 */
export function mountWelt(fx: HTMLElement, buehne: HTMLElement, reduced: boolean): Welt {
  const el = document.createElement('div')
  el.className = 'welt'
  el.setAttribute('aria-hidden', 'true')

  const schein = document.createElement('div')
  schein.className = 'welt-schein'

  const titel = document.createElement('div')
  titel.className = 'welt-titel'
  const kugelPlatz = document.createElement('span')
  kugelPlatz.className = 'welt-kugelplatz'
  const kugel = document.createElement('span')
  kugel.className = 'welt-kugel'
  kugelPlatz.append(kugel)
  const schrift = document.createElement('span')
  schrift.className = 'welt-schrift'
  const klein = document.createElement('span')
  klein.className = 'welt-klein'
  const name = document.createElement('span')
  name.className = 'welt-name'
  schrift.append(klein, name)
  titel.append(kugelPlatz, schrift)

  el.append(schein, ringe(), titel)
  fx.append(el)

  let flug: gsap.core.Timeline | null = null

  const setze = (step: Step, index: number, total: number) => {
    klein.textContent = `${de.fortschritt.schritt} ${index + 1} ${de.fortschritt.von} ${total}`
    name.textContent = de.stationNamen[step.station]
  }

  return {
    el,
    zeige(step, index, total, erster) {
      flug?.kill()
      gsap.killTweensOf(titel)
      gsap.set(titel, { clearProps: 'opacity' })
      gsap.set(kugel, { clearProps: 'all' })
      const kurz = dur(reduced ? 0.15 : 0.3)
      if (erster || kurz === 0) {
        setze(step, index, total)
        gsap.set(schrift, { clearProps: 'all' })
        if (kurz > 0) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur(0.6), ease: EASE, clearProps: 'opacity' })
        return
      }
      const tl = gsap.timeline({ defaults: { ease: EASE } })
      flug = tl
      // Titel: alter Name raus, neuer rein
      tl.to(schrift, reduced ? { opacity: 0, duration: kurz } : { opacity: 0, y: -10, duration: kurz }, 0)
      tl.call(() => setze(step, index, total))
      tl.fromTo(
        schrift,
        reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
        reduced ? { opacity: 1, duration: kurz } : { opacity: 1, y: 0, duration: dur(0.4), clearProps: 'transform,opacity' },
      )
      if (reduced) return
      // Kugel: vom Titel in die Bühnenmitte und zurück
      const b = buehne.getBoundingClientRect()
      const k = kugel.getBoundingClientRect()
      const dx = b.left + b.width / 2 - (k.left + k.width / 2)
      const dy = b.top + b.height / 2 - (k.top + k.height / 2)
      tl.to(kugel, { x: dx, y: dy, scale: 3.2, duration: dur(0.35), ease: 'power2.in' }, 0)
      tl.to(kugel, { scale: 5, opacity: 0.85, duration: dur(0.15), ease: 'power1.out' })
      tl.to(kugel, { x: 0, y: 0, scale: 1, opacity: 1, duration: dur(0.55), ease: 'power2.out', clearProps: 'transform,opacity' })
    },
    ruhe() {
      flug?.kill()
      gsap.to(titel, { opacity: 0, duration: dur(reduced ? 0.15 : 0.4), ease: EASE })
    },
    weg() {
      flug?.kill()
      el.remove()
    },
  }
}
