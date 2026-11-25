import { gsap } from 'gsap'
import { dur } from '../env'

const NS = 'http://www.w3.org/2000/svg'

export interface Welt {
  el: HTMLElement
  /** Blendet die Welt beim Start des Ablaufs ein. */
  zeige(): void
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
 * Die Welt hinter der Karte: Farbschein und kreisende Ringe in der Farbe der aktiven Station.
 * Sie bleibt über alle Stationen stehen, damit der Ablauf wie eine einzige Fahrt wirkt.
 */
export function mountWelt(fx: HTMLElement): Welt {
  const el = document.createElement('div')
  el.className = 'welt'
  el.setAttribute('aria-hidden', 'true')
  const schein = document.createElement('div')
  schein.className = 'welt-schein'
  el.append(schein, ringe())
  fx.append(el)
  return {
    el,
    zeige() {
      if (dur(0.6) > 0) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur(0.6), ease: 'power2.inOut', clearProps: 'opacity' })
    },
    weg() {
      gsap.killTweensOf(el)
      el.remove()
    },
  }
}
