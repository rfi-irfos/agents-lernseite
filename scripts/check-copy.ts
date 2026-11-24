import { scenarios } from '../src/scenarios'
import { de } from '../src/content/de'
import { checkScenario, checkUi, uiUnits } from './copy-lib'

let total = 0
for (const s of scenarios) {
  const funde = checkScenario(s)
  total += funde.length
  for (const f of funde) console.log(`${f.regel}: ${f.wo}: ${f.hinweis}`)
}
const ui = uiUnits(de)
const uiFunde = checkUi(ui)
total += uiFunde.length
for (const f of uiFunde) console.log(`${f.regel}: ${f.wo}: ${f.hinweis}`)
console.log(
  total === 0
    ? `Textprüfung: 0 Funde in ${scenarios.length} Abläufen und ${ui.length} UI-Texten.`
    : `Textprüfung: ${total} Funde.`,
)
process.exit(total === 0 ? 0 : 1)
