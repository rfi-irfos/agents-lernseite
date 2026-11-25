import { gsap } from 'gsap'
import { de } from '../content/de'
import { dur } from '../env'
import type { Step } from '../engine/steps'

const NS = 'http://www.w3.org/2000/svg'
const ZMIN = 0.12
const ZMAX = 1.6
/** Rand zwischen Knoten und Bildkante, wenn die Kamera auf einem Knoten steht. */
const RAND = 10
/** Ab so vielen Pixeln gilt eine Zeigerbewegung als Ziehen und nicht mehr als Klick. */
const ZIEH = 5

const ICON = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`
const I_MINUS = ICON('<path class="acc" d="M6 12h12"/>')
const I_PLUS = ICON('<path d="M12 6v12"/><path class="acc" d="M6 12h12"/>')
const I_ALLES = ICON('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect class="acc" x="9" y="9" width="6" height="6" rx="1"/>')
const I_STATION = ICON('<circle cx="12" cy="12" r="7"/><circle class="acc fill" cx="12" cy="12" r="2.5"/>')

export interface Karte {
  el: HTMLElement
  /** Die Fläche eines Knotens, in die seine Szene gebaut wird. */
  buehne(i: number): HTMLElement
  /** Macht Knoten i aktiv und fliegt hin. `da` läuft, sobald die Kamera steht und die Szene beginnen darf. */
  zeige(i: number, erster: boolean, da: () => void): void
  /** Die Kamera folgt wieder dem Ablauf (nach freiem Erkunden). */
  folge(): void
  weg(): void
}

interface Opts {
  steps: Step[]
  reduced: boolean
  /** Ein Knoten wurde angeklickt. */
  onWahl(i: number): void
}

interface P {
  x: number
  y: number
}

function knopf(action: string, icon: string, label: string): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'glass ctl karte-knopf'
  b.dataset.karte = action
  b.title = label
  b.setAttribute('aria-label', label)
  b.innerHTML = icon
  return b
}

/**
 * Der Ablauf als Karte: jede Station ist ein Knoten mit ihrem Erklärbild, Leitungen verbinden sie.
 * Die Kamera fliegt beim Abspielen von Knoten zu Knoten; mit Mausrad, Ziehen und Klick erkundet man frei.
 * Ein Knoten ist so groß wie die Bühne: steht die Kamera bei Zoom 1 auf ihm, füllt sein Bild das Fenster.
 */
export function mountKarte(sicht: HTMLElement, o: Opts): Karte {
  const n = o.steps.length
  const el = document.createElement('div')
  el.className = 'karte'
  const welt = document.createElement('div')
  welt.className = 'karte-welt'
  const linien = document.createElementNS(NS, 'svg')
  linien.setAttribute('class', 'karte-linien')
  linien.setAttribute('aria-hidden', 'true')
  const kugel = document.createElement('span')
  kugel.className = 'karte-kugel'
  kugel.setAttribute('aria-hidden', 'true')
  welt.append(linien)

  const knoten: HTMLElement[] = []
  const flaechen: HTMLElement[] = []
  const kanten: SVGPathElement[] = []
  const versatz: P[] = []

  o.steps.forEach((step, i) => {
    const k = document.createElement('div')
    k.className = 'knoten'
    k.dataset.i = String(i)
    k.dataset.station = step.station
    k.style.setProperty('--c', `var(--c-${step.station})`)
    const kopf = document.createElement('div')
    kopf.className = 'knoten-kopf'
    kopf.setAttribute('aria-hidden', 'true')
    const nr = document.createElement('span')
    nr.className = 'knoten-nr'
    nr.textContent = String(i + 1)
    const schrift = document.createElement('span')
    schrift.className = 'knoten-schrift'
    const klein = document.createElement('span')
    klein.className = 'knoten-klein'
    klein.textContent = `${de.fortschritt.schritt} ${i + 1} ${de.fortschritt.von} ${n}`
    const name = document.createElement('span')
    name.className = 'knoten-name'
    name.textContent = de.stationNamen[step.station]
    schrift.append(klein, name)
    kopf.append(nr, schrift)
    const flaeche = document.createElement('div')
    flaeche.className = 'knoten-buehne'
    flaeche.inert = true
    const satz = document.createElement('p')
    satz.className = 'knoten-satz'
    satz.setAttribute('aria-hidden', 'true')
    satz.textContent = step.script.text
    k.append(flaeche, kopf, satz)
    welt.append(k)
    knoten.push(k)
    flaechen.push(flaeche)
    versatz.push({ x: 0, y: 0 })
    if (i > 0) {
      const p = document.createElementNS(NS, 'path')
      p.setAttribute('class', 'kante')
      p.style.setProperty('--c', `var(--c-${step.station})`)
      linien.append(p)
      kanten.push(p)
    }
  })
  welt.append(kugel)

  // Zoom-Leiste oben rechts
  const leiste = document.createElement('div')
  leiste.className = 'karte-leiste glass'
  leiste.setAttribute('role', 'group')
  leiste.setAttribute('aria-label', de.karte.label)
  const bMinus = knopf('kleiner', I_MINUS, de.karte.kleiner)
  const bPlus = knopf('groesser', I_PLUS, de.karte.groesser)
  const bAlles = knopf('alles', I_ALLES, de.karte.alles)
  const bStation = knopf('station', I_STATION, de.karte.station)
  const prozent = document.createElement('span')
  prozent.className = 'karte-prozent'
  prozent.setAttribute('aria-hidden', 'true')
  leiste.append(bMinus, prozent, bPlus, bAlles, bStation)

  el.append(welt, leiste)
  sicht.append(el)

  let W = 1
  let H = 1
  let kw = 1
  let kh = 1
  let spalten = 4
  let reiheY = 1.46 // Abstand der Reihen in Knotenhöhen
  const cam = { x: 0, y: 0, z: 1 }
  let aktiv = 0
  let weit = -1 // höchster schon besuchter Knoten
  let frei = false
  let flug: gsap.core.Timeline | gsap.core.Tween | null = null

  const mitte = (i: number): P => {
    const reihe = Math.floor(i / spalten)
    const c = i % spalten
    const spalte = reihe % 2 ? spalten - 1 - c : c
    return { x: (spalte * 1.2 + versatz[i].x) * kw, y: (reihe * reiheY + versatz[i].y) * kh }
  }

  const pfad = (a: P, b: P): string => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (Math.abs(dx) / kw >= Math.abs(dy) / kh) {
      const s = Math.sign(dx) || 1
      const x1 = a.x + (s * kw) / 2
      const x2 = b.x - (s * kw) / 2
      const m = (x2 - x1) / 2
      return `M${x1} ${a.y} C${x1 + m} ${a.y} ${x2 - m} ${b.y} ${x2} ${b.y}`
    }
    const s = Math.sign(dy) || 1
    const y1 = a.y + (s * kh) / 2
    const y2 = b.y - (s * kh) / 2
    const m = (y2 - y1) / 2
    return `M${a.x} ${y1} C${a.x} ${y1 + m} ${b.x} ${y2 - m} ${b.x} ${y2}`
  }

  const lege = () => {
    for (let i = 0; i < n; i++) {
      const p = mitte(i)
      knoten[i].style.transform = `translate(${p.x - kw / 2}px, ${p.y - kh / 2}px)`
      if (i > 0) kanten[i - 1].setAttribute('d', pfad(mitte(i - 1), p))
    }
  }

  const male = () => {
    welt.style.transform = `translate(${W / 2 - cam.x * cam.z}px, ${H / 2 - cam.y * cam.z}px) scale(${cam.z})`
    prozent.textContent = `${Math.round(cam.z * 100)} %`
    el.dataset.sicht = cam.z < 0.72 ? 'weit' : 'nah'
    // Herausgezoomt wachsen Kopf und Satz mit, damit sie lesbar bleiben.
    const k = Math.min(3.2, Math.max(1, 0.5 / cam.z))
    welt.style.setProperty('--kopf', k.toFixed(3))
    welt.style.setProperty('--satz', Math.min(1.7, k).toFixed(3))
  }

  const messe = () => {
    W = Math.max(1, sicht.clientWidth)
    H = Math.max(1, sicht.clientHeight)
    kw = Math.max(120, W - 2 * RAND)
    kh = Math.max(120, H - 2 * RAND)
    spalten = W / H > 1.25 ? 4 : W / H > 0.8 ? 3 : 2
    // Die nächste Reihe beginnt erst unter dem Bildrand, damit bei Zoom 1 nur ein Knoten im Bild steht.
    reiheY = 1 + Math.max(0.34 * kh, window.innerHeight - H + 48) / kh
    welt.style.setProperty('--kw', `${kw}px`)
    welt.style.setProperty('--kh', `${kh}px`)
    lege()
  }

  const zustand = () => {
    knoten.forEach((k, i) => {
      k.classList.toggle('aktiv', i === aktiv)
      k.classList.toggle('besucht', i <= weit)
      flaechen[i].inert = i !== aktiv
    })
    kanten.forEach((p, j) => p.classList.toggle('an', j + 1 <= weit))
  }

  const halt = () => {
    flug?.kill()
    flug = null
    gsap.set(kugel, { opacity: 0 })
  }

  /** Kamera weich an eine Stelle; für die Knöpfe der Zoom-Leiste. */
  const fahre = (x: number, y: number, z: number, sek = 0.45) => {
    halt()
    const t = dur(o.reduced ? 0 : sek)
    if (t === 0) {
      Object.assign(cam, { x, y, z })
      male()
      return
    }
    flug = gsap.to(cam, { x, y, z, duration: t, ease: 'power2.inOut', onUpdate: male })
  }

  const zoomUm = (faktor: number, px = W / 2, py = H / 2, weich = false) => {
    const z = Math.min(ZMAX, Math.max(ZMIN, cam.z * faktor))
    // Der Punkt der Welt unter (px, py) bleibt unter dem Zeiger.
    const wx = cam.x + (px - W / 2) / cam.z
    const wy = cam.y + (py - H / 2) / cam.z
    const x = wx - (px - W / 2) / z
    const y = wy - (py - H / 2) / z
    frei = true
    if (weich) fahre(x, y, z, 0.25)
    else {
      halt()
      Object.assign(cam, { x, y, z })
      male()
    }
  }

  const alles = () => {
    let l = Infinity
    let r = -Infinity
    let t = Infinity
    let b = -Infinity
    for (let i = 0; i < n; i++) {
      const p = mitte(i)
      l = Math.min(l, p.x - kw / 2)
      r = Math.max(r, p.x + kw / 2)
      t = Math.min(t, p.y - kh / 2)
      b = Math.max(b, p.y + kh * 0.8)
    }
    const z = Math.min(1, Math.max(ZMIN, Math.min(W / (r - l), H / (b - t)) * 0.9))
    frei = true
    fahre((l + r) / 2, (t + b) / 2, z, 0.7)
  }

  const zurStation = () => {
    frei = false
    const p = mitte(aktiv)
    fahre(p.x, p.y, 1, 0.7)
  }

  bMinus.addEventListener('click', () => zoomUm(1 / 1.3, W / 2, H / 2, true))
  bPlus.addEventListener('click', () => zoomUm(1.3, W / 2, H / 2, true))
  bAlles.addEventListener('click', alles)
  bStation.addEventListener('click', zurStation)

  // Zeiger: Ziehen verschiebt die Karte, am Knotenkopf den Knoten; zwei Finger zoomen.
  const zeiger = new Map<number, P>()
  let art: 'karte' | 'knoten' | null = null
  let ziehKnoten = -1
  let weg0 = 0
  let gezogen = false
  let abstand0 = 0

  const lokal = (e: PointerEvent | WheelEvent): P => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const runter = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const t = e.target as Element
    if (t.closest('.karte-leiste')) return
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (zeiger.size === 2) {
      const [a, b] = [...zeiger.values()]
      abstand0 = Math.hypot(a.x - b.x, a.y - b.y)
      art = 'karte'
      gezogen = true
      return
    }
    weg0 = 0
    gezogen = false
    const kopf = t.closest('.knoten-kopf')
    const bedienbar = t.closest('button, a, input, textarea, select, [role=button], [tabindex]')
    if (kopf) {
      art = 'knoten'
      ziehKnoten = Number(kopf.closest<HTMLElement>('.knoten')!.dataset.i)
    } else art = bedienbar ? null : 'karte'
  }

  const bewegt = (e: PointerEvent) => {
    const vor = zeiger.get(e.pointerId)
    if (!vor || !art) return
    const dx = e.clientX - vor.x
    const dy = e.clientY - vor.y
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (zeiger.size === 2) {
      const [a, b] = [...zeiger.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (abstand0 > 0 && d > 0) {
        const r = el.getBoundingClientRect()
        zoomUm(d / abstand0, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top)
      }
      abstand0 = d
      return
    }
    weg0 += Math.abs(dx) + Math.abs(dy)
    if (!gezogen) {
      if (weg0 < ZIEH) return
      gezogen = true
      el.classList.add('zieht')
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* Zeiger schon weg */
      }
    }
    if (art === 'knoten') {
      versatz[ziehKnoten].x += dx / cam.z / kw
      versatz[ziehKnoten].y += dy / cam.z / kh
      lege()
      return
    }
    halt()
    frei = true
    cam.x -= dx / cam.z
    cam.y -= dy / cam.z
    male()
  }

  const hoch = (e: PointerEvent) => {
    zeiger.delete(e.pointerId)
    if (zeiger.size === 0) {
      art = null
      el.classList.remove('zieht')
    }
  }

  /** Nach einem Ziehen folgt kein Klick; ein Klick auf einen anderen Knoten springt dorthin. */
  const klick = (e: MouseEvent) => {
    if (gezogen) {
      gezogen = false
      e.stopPropagation()
      e.preventDefault()
      return
    }
    const k = (e.target as Element).closest<HTMLElement>('.knoten')
    if (!k) return
    const i = Number(k.dataset.i)
    if (i === aktiv) return
    frei = false
    o.onWahl(i)
  }

  const rad = (e: WheelEvent) => {
    e.preventDefault()
    const p = lokal(e)
    const schritt = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    zoomUm(Math.exp(-schritt * 0.0016), p.x, p.y)
  }

  const taste = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
    const t = e.target instanceof Element ? e.target : null
    if (t?.closest('input, textarea, select, [contenteditable]')) return
    if (!el.isConnected) return
    if (e.key === '+') zoomUm(1.3, W / 2, H / 2, true)
    else if (e.key === '-') zoomUm(1 / 1.3, W / 2, H / 2, true)
    else if (e.key === '0') alles()
  }

  el.addEventListener('pointerdown', runter)
  el.addEventListener('pointermove', bewegt)
  el.addEventListener('pointerup', hoch)
  el.addEventListener('pointercancel', hoch)
  el.addEventListener('click', klick, true)
  el.addEventListener('wheel', rad, { passive: false })
  document.addEventListener('keydown', taste)

  const ro = new ResizeObserver(() => {
    messe()
    if (!frei) {
      halt()
      const p = mitte(aktiv)
      Object.assign(cam, { x: p.x, y: p.y, z: 1 })
    }
    male()
  })
  ro.observe(sicht)

  messe()
  zustand()
  male()

  return {
    el,
    buehne: (i) => flaechen[i],
    folge() {
      frei = false
    },
    zeige(i, erster, da) {
      const von = aktiv
      aktiv = i
      weit = Math.max(weit, i)
      zustand()
      halt()
      const ziel = mitte(i)
      const t = dur(o.reduced ? 0.15 : 1.05)
      if (frei && !erster) return da()
      if (erster || t === 0) {
        Object.assign(cam, { x: ziel.x, y: ziel.y, z: 1 })
        male()
        if (t > 0) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur(0.6), ease: 'power2.inOut', clearProps: 'opacity' })
        return da()
      }
      if (o.reduced) {
        // Ohne Fahrt: kurz ausblenden, umsetzen, einblenden.
        const tl = gsap.timeline({ onComplete: da })
        tl.to(welt, { opacity: 0, duration: t, ease: 'power2.inOut' })
        tl.call(() => {
          Object.assign(cam, { x: ziel.x, y: ziel.y, z: 1 })
          male()
        })
        tl.to(welt, { opacity: 1, duration: t, ease: 'power2.inOut', clearProps: 'opacity' })
        flug = tl
        return
      }
      const tl = gsap.timeline({ onComplete: da, onUpdate: male })
      const tief = Math.min(cam.z, 0.66)
      tl.to(cam, { x: ziel.x, y: ziel.y, duration: t, ease: 'power3.inOut' }, 0)
      tl.to(cam, { z: tief, duration: t * 0.42, ease: 'power2.out' }, 0)
      tl.to(cam, { z: 1, duration: t * 0.58, ease: 'power2.inOut' }, t * 0.42)
      // Die Kugel trägt die Daten über die Leitung zum nächsten Knoten.
      const kante = i === von + 1 ? kanten[i - 1] : null
      if (kante) {
        const lang = kante.getTotalLength()
        const lauf = { s: 0 }
        tl.set(kugel, { opacity: 1 }, 0)
        tl.to(
          lauf,
          {
            s: 1,
            duration: t * 0.8,
            ease: 'power2.inOut',
            onUpdate: () => {
              const p = kante.getPointAtLength(lauf.s * lang)
              kugel.style.transform = `translate(${p.x}px, ${p.y}px)`
            },
          },
          t * 0.05,
        )
        tl.to(kugel, { opacity: 0, duration: t * 0.15 }, t * 0.85)
      }
      flug = tl
    },
    weg() {
      halt()
      ro.disconnect()
      document.removeEventListener('keydown', taste)
      el.remove()
    },
  }
}
