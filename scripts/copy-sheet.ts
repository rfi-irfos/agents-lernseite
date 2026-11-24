import { mkdirSync, writeFileSync } from 'node:fs'
import { scenarios } from '../src/scenarios'
import { de } from '../src/content/de'
import type { Scenario, StationScript } from '../src/engine/types'

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const name = (id: string) => (de.stationNamen as Record<string, string>)[id] ?? id

function station(st: StationScript): string {
  const rows: string[] = [`<h4>${esc(name(st.id))}${st.kurz ? ' <small>(kurz)</small>' : ''}</h4>`, `<p class="text">${esc(st.text)}</p>`]
  if (st.gedaechtnis) rows.push(`<p class="neben"><b>Gedächtnis:</b> ${esc(st.gedaechtnis)}</p>`)
  const sch = st.daten?.schritte
  if (Array.isArray(sch)) rows.push(`<p class="neben"><b>Plankarten:</b> ${sch.map((x) => esc(String(x))).join(' · ')}</p>`)
  if (st.werkzeug) {
    const w = st.werkzeug
    rows.push(
      `<p class="neben"><b>Mitmach-Frage:</b> ${esc(w.frage)}</p><ol class="karten">${w.karten
        .map((k, i) => `<li${i === w.richtig ? ' class="richtig"' : ''}>${esc(k.label)}</li>`)
        .join('')}</ol><p class="neben"><b>Erklärung:</b> ${esc(w.erklaerung)}</p>`,
    )
  }
  if (st.tiefer) rows.push(`<ul class="tiefer">${st.tiefer.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)
  return `<section class="station">${rows.join('')}</section>`
}

function ablauf(s: Scenario): string {
  const second = s.schleife
    ? `<h3>Schleife</h3><p class="neben"><b>Grund:</b> ${esc(s.schleife.grund)}</p>${s.schleife.zweiterDurchlauf.map(station).join('')}`
    : ''
  return `<article><h2>${esc(s.titel)} <small>${esc(s.id)} · ${esc(s.art)}</small></h2>
<p class="aufgabe"><b>Aufgabe:</b> ${esc(s.aufgabe)}</p>
<h3>Erster Durchlauf</h3>${s.stationen.map(station).join('')}${second}
<h3>Antwort</h3><p class="text">${esc(s.ergebnis)}</p></article>`
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Texte: So arbeitet ein KI-Agent</title>
<style>
body{font:16px/1.5 system-ui,"Segoe UI",Inter,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1B2433;background:#F4F6FA}
article{background:#fff;border:1px solid #D5DCE8;border-radius:14px;padding:1rem 1.5rem;margin:2rem 0}
h2 small,h4 small{font-weight:400;color:#4B5563;font-size:.7em}
.station{border-top:1px solid #D5DCE8;padding:.25rem 0}
h4{margin:.5rem 0 .25rem}
.text{font-size:1.1rem;margin:.25rem 0}
.neben{margin:.25rem 0;color:#1B2433}
.tiefer{margin:.25rem 0;padding-left:1.25rem;color:#1B2433}
.karten{margin:.25rem 0}.richtig{font-weight:700}
</style></head><body><h1>Alle Texte je Ablauf und Station</h1>
<p>Zum Gegenlesen. Fett bei den Karten: die richtige Wahl.</p>
${scenarios.map(ablauf).join('\n')}
</body></html>`

mkdirSync('test-out', { recursive: true })
writeFileSync('test-out/texte.html', html)
console.log(`test-out/texte.html geschrieben (${scenarios.length} Abläufe).`)
