/** Alle Zeichnungen aus src/svg als Text, damit sie im Build liegen und mit dem Thema mitfärben. */
const ALL = import.meta.glob('../svg/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export function svgRaw(name: string): string {
  return ALL[`../svg/${name}.svg`] ?? ''
}
