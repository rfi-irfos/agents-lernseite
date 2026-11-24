
import { describe, it, expect } from 'vitest'
import html from '../../index.html?raw'

describe('index.html', () => {
  it('verweist auf ein Favicon, sonst meldet der Browser einen 404 in der Konsole', () => {
    expect(html).toMatch(/<link rel="icon"[^>]+href="\/icons\/192\.png"/)
  })
  it('hat eine Beschreibung mit echten Umlauten', () => {
    const m = html.match(/<meta name="description" content="([^"]+)"/)
    expect(m).not.toBeNull()
    expect(m![1].length).toBeGreaterThan(40)
  })
})
