import type { Format } from './types'

export function formatFor(w: number, h: number): Format {
  const r = w / h
  if (r < 0.8) return 'hoch'
  if (r > 1.25) return 'quer'
  return 'quadrat'
}

/** Meldet das Format einmal sofort und danach nur bei Änderung (resize/orientationchange, 120 ms entprellt). */
export function watchFormat(cb: (f: Format) => void): () => void {
  const current = (): Format => formatFor(window.innerWidth, window.innerHeight)
  let last = current()
  cb(last)
  let timer: ReturnType<typeof setTimeout> | undefined
  const onChange = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const f = current()
      if (f !== last) {
        last = f
        cb(f)
      }
    }, 120)
  }
  window.addEventListener('resize', onChange)
  window.addEventListener('orientationchange', onChange)
  return () => {
    clearTimeout(timer)
    window.removeEventListener('resize', onChange)
    window.removeEventListener('orientationchange', onChange)
  }
}
