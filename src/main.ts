import './theme/tokens.css'
import './theme/layout.css'
import './theme/glass.css'
import { de } from './content/de'
import { applyTheme, initialTheme, toggleTheme } from './theme/theme'
import { watchFormat } from './engine/format'
import { applyFormat } from './ui/layout'

applyTheme(initialTheme())
watchFormat(applyFormat)

const btn = document.querySelector<HTMLButtonElement>('[data-action=theme]')
if (btn) {
  btn.textContent = de.theme.toggle
  btn.addEventListener('click', () => toggleTheme())
}
document.title = de.title
