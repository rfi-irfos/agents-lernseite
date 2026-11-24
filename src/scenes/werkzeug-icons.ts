import wetter from '../svg/werkzeug-wetter.svg?raw'
import rechner from '../svg/werkzeug-rechner.svg?raw'
import album from '../svg/werkzeug-album.svg?raw'
import allgemein from '../svg/werkzeug-allgemein.svg?raw'

const ICONS: Record<string, string> = { wetter, rechner, album }

export function iconSvg(name: string): string {
  return ICONS[name] ?? allgemein
}
