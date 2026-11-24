import { describe, it, expect, vi } from 'vitest'
import { createReloadGuard } from '../../src/pwa-reload'

function setup(hidden: boolean, phase: string) {
  const s = { hidden, phase, vis: [] as Array<() => void>, ph: [] as Array<() => void>, reload: vi.fn() }
  const arm = createReloadGuard({
    hidden: () => s.hidden,
    phase: () => s.phase,
    watchPhase: (cb) => { s.ph.push(cb); return () => { s.ph = s.ph.filter((x) => x !== cb) } },
    watchVisibility: (cb) => { s.vis.push(cb); return () => { s.vis = s.vis.filter((x) => x !== cb) } },
    reload: s.reload,
  })
  return { s, arm }
}

describe('Reload-Wächter', () => {
  it('Tab versteckt mitten im Ablauf (play): kein Neuladen', () => {
    const { s, arm } = setup(false, 'play')
    arm()
    s.hidden = true
    s.vis.forEach((f) => f())
    expect(s.reload).not.toHaveBeenCalled()
  })
  it('wartet, bis das Startbild erreicht ist', () => {
    const { s, arm } = setup(true, 'play')
    arm()
    s.vis.forEach((f) => f())
    expect(s.reload).not.toHaveBeenCalled()
    s.phase = 'start'
    s.ph.forEach((f) => f())
    expect(s.reload).toHaveBeenCalledTimes(1)
  })
  it('versteckt im Startbild: lädt neu', () => {
    const { s, arm } = setup(false, 'start')
    arm()
    s.hidden = true
    s.vis.forEach((f) => f())
    expect(s.reload).toHaveBeenCalledTimes(1)
  })
  it('doppeltes Scharfstellen legt keine zweiten Wächter an', () => {
    const { s, arm } = setup(false, 'play')
    arm(); arm()
    expect(s.vis.length).toBe(1)
    expect(s.ph.length).toBe(1)
  })
})
