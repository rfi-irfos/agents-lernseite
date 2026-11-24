import { parseHandelnDaten } from '../src/engine/handeln'
import type { Scenario, StationScript } from '../src/engine/types'

/** Reine Prüf- und Sammelfunktionen für Texte, ohne Dateizugriff (damit sie sich testen lassen). */

export type Unit = { wo: string; art: 'text' | 'tiefer' | 'sonst' | 'daten' | 'code'; text: string }
export type Fund = { regel: string; wo: string; hinweis: string }

const ABK = ['z. B.', 'd. h.', 'u. a.', 'ca.', 'bzw.', 'usw.', 'etc.', 'Nr.', 'vgl.', 'ggf.', 'evtl.', 'z. T.']

/** Teilt in Sätze. Abkürzungen („z. B.“), Dezimalzahlen („3,5“), Prozent („80 %“) und Anführungszeichen nach dem Punkt zählen nicht als Satzende. */
export function sentences(text: string): string[] {
  let t = text.trim()
  if (!t) return []
  ABK.forEach((a, i) => (t = t.split(a).join(`\u0001${i}\u0002`)))
  t = t.replace(/(\d)\.(\d)/g, '$1\u0003$2')
  const out: string[] = []
  const re = /[^.!?…]+(?:[.!?…]+["“”„‚‘’»«)\]]*|$)/g
  for (const m of t.matchAll(re)) {
    const s = m[0].trim()
    if (s) out.push(s)
  }
  return out.map((s) =>
    s.replace(/\u0003/g, '.').replace(/\u0001(\d+)\u0002/g, (_, i: string) => ABK[Number(i)]),
  )
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

const JARGON = ['LLM', 'API', 'Token', 'Prompt', 'Sprachmodell', 'Algorithmus']
const NEGATION = [
  /\bnicht nur\b.*\bsondern\b/i,
  /\bmehr als nur\b/i,
  /\bstatt nur\b/i,
  /\b(?:nicht|kein|keine|keinen|keinem|keiner|keines|ohne|nie|niemals|niemand|nichts|weder)\b/i,
]
const GRATIS = /\b(?:kostenlos\w*|gratis)\b/i
const ASCII_UMLAUT = [
  'fuer', 'ueber', 'koennen', 'koennte', 'moechte', 'muessen', 'muesste', 'waehlen', 'waehrend', 'naechste', 'naechsten',
  'zurueck', 'prueft', 'pruefen', 'pruefung', 'gruen', 'frueh', 'fruehstueck', 'loesung', 'loesen', 'groesse', 'gross',
  'aehnlich', 'aendern', 'aender', 'erklaerung', 'taeglich', 'natuerlich', 'ergaenzen', 'zaehlen', 'woerter', 'wuerde',
  'wuerden', 'duerfen', 'schliessen', 'strasse', 'gedaechtnis', 'ausfuehren', 'fuehrt', 'kuenftig', 'taetig', 'hoeren',
  'schoen', 'schueler', 'mueller', 'tuer', 'koerper', 'oeffnen', 'oeffnet', 'spaeter', 'zusaetzlich', 'saetze',
]

/** Texte der Handeln-Animation, wie sie auf dem Bildschirm stehen. Codezeilen erscheinen im Prüfblatt, die Regeln gelten dort nicht. */
export function handelnTexte(art: Scenario['art'], daten: unknown): { wo: string; text: string; art: 'daten' | 'code' }[] {
  const out: { wo: string; text: string; art: 'daten' | 'code' }[] = []
  const add = (wo: string, text: string, a: 'daten' | 'code' = 'daten') => text.trim() && out.push({ wo, text, art: a })
  if (art === 'suche') {
    parseHandelnDaten('suche', daten)?.treffer.forEach((t, i) => {
      add(`Treffer ${i + 1} Titel`, t.titel)
      add(`Treffer ${i + 1} Detail`, t.detail)
    })
  } else if (art === 'api') {
    const d = parseHandelnDaten('api', daten)
    if (d) {
      add('Anfrage', d.anfrage)
      add('Antwort', d.antwort)
    }
  } else if (art === 'code') {
    const d = parseHandelnDaten('code', daten)
    if (d) {
      d.zeilen.forEach((z, i) => add(`Codezeile ${i + 1}`, z, 'code'))
      add('Testname', d.test.name)
    }
  } else if (art === 'bild') {
    parseHandelnDaten('bild', daten)?.markierungen.forEach((m, i) => add(`Markierung ${i + 1}`, m.label))
  } else {
    parseHandelnDaten('planung', daten)?.punkte.forEach((p, i) => {
      add(`Halt ${i + 1} Ort`, p.ort)
      add(`Halt ${i + 1} Zeit`, p.zeit)
    })
  }
  return out
}

/** Alle Texte eines Ablaufs mit Fundort. Aufgabe und Handeln-Daten bleiben draußen, sie wiederholen die Erzählung absichtlich. */
export function collect(s: Scenario): Unit[] {
  const u: Unit[] = []
  const add = (wo: string, art: Unit['art'], text: string | undefined) => {
    if (text && text.trim()) u.push({ wo: `${s.id}/${wo}`, art, text })
  }
  const station = (st: StationScript, pre: string) => {
    add(`${pre}${st.id}`, 'text', st.text)
    st.tiefer?.forEach((t, i) => add(`${pre}${st.id}/tiefer ${i + 1}`, 'tiefer', t))
    add(`${pre}${st.id}/Gedächtnis`, 'sonst', st.gedaechtnis)
    if (st.werkzeug) {
      add(`${pre}${st.id}/Frage`, 'sonst', st.werkzeug.frage)
      add(`${pre}${st.id}/Erklärung`, 'sonst', st.werkzeug.erklaerung)
      st.werkzeug.karten.forEach((k, i) => add(`${pre}${st.id}/Karte ${i + 1}`, 'daten', k.label))
    }
    if (st.id === 'handeln') handelnTexte(s.art, st.daten).forEach((h) => add(`${pre}${st.id}/${h.wo}`, h.art, h.text))
    const sch = st.daten?.schritte
    if (Array.isArray(sch)) sch.forEach((x, i) => typeof x === 'string' && add(`${pre}${st.id}/Schritt ${i + 1}`, 'sonst', x))
  }
  s.stationen.forEach((st) => station(st, ''))
  if (s.schleife) {
    add('Schleifengrund', 'sonst', s.schleife.grund)
    s.schleife.zweiterDurchlauf.forEach((st) => station(st, 'zweiter Durchlauf/'))
  }
  add('Ergebnis (Antwort)', 'sonst', s.ergebnis)
  return u
}

const STOP = new Set(
  'der die das den dem des ein eine einen einem einer er sie es du dich dir dein deine deinen deiner und oder aber dann denn ist sind wird hat haben im in am an auf zu zum zur mit von vor für nach bei als wie wo was so auch noch schon nur jetzt wieder diesmal dort dafür damit dabei darum also ja ihm ihn ihr sein seine seinen seiner seinem'.split(' '),
)
const words = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Dreiwortfolgen, die in mindestens zwei verschiedenen Texten eines Ablaufs vorkommen; Folgen aus Füllwörtern zählen nicht. */
export function repeatedTrigrams(units: Unit[]): { folge: string; wo: string[] }[] {
  const seen = new Map<string, Set<string>>()
  for (const u of units) {
    const w = words(u.text)
    const own = new Set<string>()
    for (let i = 0; i + 2 < w.length; i++) {
      const tri = w.slice(i, i + 3)
      if (tri.filter((x) => !STOP.has(x)).length < 2) continue
      own.add(tri.join(' '))
    }
    for (const k of own) {
      if (!seen.has(k)) seen.set(k, new Set())
      seen.get(k)!.add(u.wo)
    }
  }
  return [...seen].filter(([, wo]) => wo.size > 1).map(([folge, wo]) => ({ folge, wo: [...wo] }))
}

/** Alle Zeichenketten eines (verschachtelten) Textobjekts mit ihrem Pfad, etwa „de.start.note“. */
export function uiUnits(obj: unknown, pre = 'de'): Unit[] {
  if (typeof obj === 'string') return obj.trim() ? [{ wo: pre, art: 'sonst', text: obj }] : []
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => uiUnits(v, `${pre}.${k}`))
  return []
}

/**
 * Genau zwei Ausnahmen von der Verneinungsregel, wörtlich:
 * Zabihs Merksatz (sein Wortlaut, Vorgabe der Spezifikation) und der vorgeschriebene Hinweis zum Modell.
 */
export const UI_ERLAUBT: readonly { wo: string; text: string }[] = [
  {
    wo: 'de.rueckblick.besser.merksatz',
    text: 'Ein Agent wird nur besser, wenn er Rückmeldung bekommt, sie speichert und beim nächsten Mal nutzt. Ohne Prüfung durch einen Menschen kann er auch schlechter werden.',
  },
  { wo: 'de.start.note', text: 'Im Hintergrund läuft kein echtes KI-Modell.' },
]

/** Prüft die UI-Texte mit denselben Regeln wie die Abläufe (ohne Wiederholungs- und Satzanzahl-Regel). */
export function checkUi(units: Unit[]): Fund[] {
  return checkUnits(units, (u) => UI_ERLAUBT.some((a) => a.wo === u.wo && a.text === u.text))
}

export function checkScenario(s: Scenario): Fund[] {
  const funde = checkUnits(collect(s))
  // Planschritte sind die Plankarten zum Plansatz und wiederholen ihn mit Absicht.
  for (const r of repeatedTrigrams(collect(s).filter((x) => !x.wo.includes('/Schritt ') && x.art !== 'daten' && x.art !== 'code'))) {
    funde.push({ regel: 'Wiederholung', wo: r.wo.join(' und '), hinweis: `Wortfolge „${r.folge}“` })
  }
  return funde
}

function checkUnits(units: Unit[], erlaubtOhneVerneinung: (u: Unit) => boolean = () => false): Fund[] {
  const funde: Fund[] = []
  for (const u of units) {
    if (u.art === 'code') continue
    for (const satz of sentences(u.text)) {
      const n = wordCount(satz)
      if (n > 18) funde.push({ regel: 'Satzlänge', wo: u.wo, hinweis: `${n} Wörter: „${satz}“` })
    }
    if (u.art === 'text') {
      const n = sentences(u.text).length
      if (n > 1) funde.push({ regel: 'Satzanzahl', wo: u.wo, hinweis: `${n} Sätze statt einem` })
    }
    if (u.art !== 'tiefer') {
      for (const j of JARGON) {
        if (new RegExp(`(^|[^\\p{L}\\p{N}])${j}s?($|[^\\p{L}\\p{N}])`, 'iu').test(u.text)) {
          funde.push({ regel: 'Fachwort', wo: u.wo, hinweis: `„${j}“ im Text auf dem Bildschirm (nur in tiefer mit Erklärung erlaubt)` })
        }
      }
    }
    for (const re of NEGATION) {
      if (erlaubtOhneVerneinung(u)) break
      const m = u.text.match(re)
      if (m) funde.push({ regel: 'Verneinung', wo: u.wo, hinweis: `„${m[0]}“` })
    }
    const g = u.text.match(GRATIS)
    if (g) funde.push({ regel: 'Gratis', wo: u.wo, hinweis: `„${g[0]}“` })
    for (const w of words(u.text)) {
      if (ASCII_UMLAUT.some((a) => w === a || (a.length > 5 && w.startsWith(a)))) {
        funde.push({ regel: 'Umlaut', wo: u.wo, hinweis: `„${w}“ mit ASCII-Ersatz` })
      }
    }
  }
  return funde
}
