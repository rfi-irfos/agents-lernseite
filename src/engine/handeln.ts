import type { Art, HandelnDatenMap } from './types'

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isStr = (x: unknown): x is string => typeof x === 'string'
const list = (x: unknown): unknown[] | null => (Array.isArray(x) ? x : null)

/** Adressen im Netz sind verboten: die App lädt zur Laufzeit nichts von fremden Servern. */
export function isLocalAsset(src: string): boolean {
  return /^[\w-]+$/.test(src)
}

const PARSERS: { [A in Art]: (d: Record<string, unknown>) => HandelnDatenMap[A] | null } = {
  suche: (d) => {
    const t = list(d.treffer)
    if (!t || !t.every((x) => isObj(x) && isStr(x.titel) && isStr(x.detail))) return null
    return { treffer: t as HandelnDatenMap['suche']['treffer'] }
  },
  api: (d) => (isStr(d.anfrage) && isStr(d.antwort) ? { anfrage: d.anfrage, antwort: d.antwort } : null),
  code: (d) => {
    const z = list(d.zeilen)
    const t = d.test
    if (!z || !z.every(isStr) || !isObj(t) || !isStr(t.name) || typeof t.ok !== 'boolean') return null
    return { zeilen: z as string[], test: { name: t.name, ok: t.ok } }
  },
  bild: (d) => {
    const m = list(d.markierungen)
    if (!isStr(d.src) || !isLocalAsset(d.src) || !m) return null
    const ok = m.every(
      (x) => isObj(x) && typeof x.x === 'number' && typeof x.y === 'number' && isStr(x.label) && x.x >= 0 && x.x <= 100 && x.y >= 0 && x.y <= 100,
    )
    return ok ? { src: d.src, markierungen: m as HandelnDatenMap['bild']['markierungen'] } : null
  },
  planung: (d) => {
    const p = list(d.punkte)
    if (!p || !p.every((x) => isObj(x) && isStr(x.ort) && isStr(x.zeit))) return null
    return { punkte: p as HandelnDatenMap['planung']['punkte'] }
  },
}

/** Prüft `daten` gegen die Form der `art`; `null`, wenn sie nicht passt. */
export function parseHandelnDaten<A extends Art>(art: A, daten: unknown): HandelnDatenMap[A] | null {
  if (!isObj(daten)) return null
  return PARSERS[art](daten) as HandelnDatenMap[A] | null
}
