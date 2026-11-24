import { parseHandelnDaten } from './handeln'
import type { Scenario, StationId, StationScript } from './types'

const ORDER: StationId[] = [
  'eingabe', 'wahrnehmung', 'denken', 'planung', 'werkzeug', 'handeln', 'pruefen', 'ergebnis',
]
const SECOND: StationId[] = ['denken', 'planung', 'werkzeug', 'handeln', 'pruefen']
const JARGON = ['LLM', 'API', 'Token', 'Prompt']
const MAX_WORDS = 18

function sameIds(got: StationId[], want: StationId[]): boolean {
  return got.length === want.length && got.every((id, i) => id === want[i])
}

function checkStation(st: StationScript, where: string, out: string[]): void {
  const text = st.text.trim()
  const ohneAuslassung = text.replace(/…/g, '').replace(/\.{3}/g, '')
  const marks = (ohneAuslassung.slice(0, -1).match(/[.!?]/g) ?? []).length
  if (marks > 0) out.push(`${where}: Der Text hat mehr als einen Satz.`)
  const words = text.split(/\s+/).filter(Boolean).length
  if (words > MAX_WORDS) out.push(`${where}: Der Text hat ${words} Wörter, erlaubt sind ${MAX_WORDS}.`)
  for (const w of JARGON) {
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${w}($|[^\\p{L}\\p{N}])`, 'iu').test(text)) {
      out.push(`${where}: Fachwort „${w}“ im Text.`)
    }
  }
  if (st.tiefer && (st.tiefer.length < 2 || st.tiefer.length > 4)) {
    out.push(`${where}: tiefer braucht 2 bis 4 Einträge, hat ${st.tiefer.length}.`)
  }
  if (st.werkzeug && ![0, 1, 2].includes(st.werkzeug.richtig)) {
    out.push(`${where}: richtig muss 0, 1 oder 2 sein.`)
  }
}

export function validateScenario(s: Scenario): string[] {
  const out: string[] = []
  if (!sameIds(s.stationen.map((x) => x.id), ORDER)) {
    out.push(`${s.id}: Die Stationen müssen genau einmal in dieser Reihenfolge stehen: ${ORDER.join(', ')}.`)
  }
  s.stationen.forEach((st) => checkStation(st, `${s.id}/${st.id}`, out))

  const second = s.schleife?.zweiterDurchlauf ?? []
  if (s.schleife) {
    const ids = second.map((x) => x.id)
    if (!sameIds(ids, SECOND)) {
      out.push(`${s.id}: Der zweite Durchlauf muss ${SECOND.join(', ')} sein (beginnt mit denken, endet mit pruefen).`)
    }
    second.forEach((st) => checkStation(st, `${s.id}/zweiter Durchlauf/${st.id}`, out))
  }

  const erster = s.stationen.find((x) => x.id === 'handeln')
  const zweiter = second.find((x) => x.id === 'handeln')
  const checkDaten = (st: StationScript | undefined, where: string) => {
    if (!st || !parseHandelnDaten(s.art, st.daten)) out.push(`${where}: daten fehlen oder passen nicht zur Art „${s.art}“.`)
  }
  checkDaten(erster, `${s.id}/handeln`)
  if (s.schleife) checkDaten(zweiter, `${s.id}/handeln (zweiter Durchlauf)`)

  const quizzes = [...s.stationen, ...second].filter((x) => x.werkzeug).length
  if (quizzes !== 1) {
    out.push(`${s.id}: Es muss genau eine Werkzeugfrage geben, gefunden: ${quizzes}.`)
  }
  return out
}
