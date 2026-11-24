import { scenarios } from '../src/scenarios'
import { checkScenario } from './copy-lib'

let total = 0
for (const s of scenarios) {
  const funde = checkScenario(s)
  total += funde.length
  for (const f of funde) console.log(`${f.regel}: ${f.wo}: ${f.hinweis}`)
}
console.log(total === 0 ? `Textprüfung: 0 Funde in ${scenarios.length} Abläufen.` : `Textprüfung: ${total} Funde.`)
process.exit(total === 0 ? 0 : 1)
