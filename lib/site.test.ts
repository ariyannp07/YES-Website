import { describe, expect, it } from 'vitest'

import { NAV, YES_MESSAGE } from './site'

const visible = () => NAV.filter((item) => !item.hidden)

describe('primary navigation', () => {
  it('promotes exactly the five owner-chosen destinations, in order', () => {
    expect(visible().map((item) => item.label)).toEqual([
      'Common Room',
      'Hacker House',
      'Press',
      'Thesis',
    ])
  })

  /**
   * The landing used to carry a #press section, so Press was an in-page anchor.
   * That section is gone, and an anchor into a deleted section is a dead link
   * that still looks alive. Every promoted destination must be a real route.
   */
  it('points every promoted item at a real route, never an in-page anchor', () => {
    for (const item of visible()) {
      expect(item.href).toMatch(/^\/[a-z-]*$/)
      expect(item.href).not.toContain('#')
    }
  })

  it('sends Press to the Reservoir index rather than the old anchor', () => {
    const press = visible().find((item) => item.label === 'Press')

    expect(press?.href).toBe('/reservoir')
  })

  it('keeps People reachable but unpromoted', () => {
    const people = NAV.find((item) => item.label === 'People')

    expect(people?.href).toBe('/catalog')
    expect(people?.hidden).toBe(true)
  })

  it('keeps Hacker House pointed at its own page', () => {
    const hackerHouse = visible().find((item) => item.label === 'Hacker House')

    expect(hackerHouse?.href).toBe('/hacker-house')
  })

  /**
   * The footer renders this same list. It used to keep its own hand-written
   * copy, which drifted — a Press link to the deleted /#press anchor and a
   * People link the header had already stopped promoting.
   */
  it('promotes nothing that points outside the site’s own routes', () => {
    for (const item of visible()) {
      expect(item.href.startsWith('/')).toBe(true)
    }
  })

  it('has no duplicate hrefs across the whole structure', () => {
    const hrefs = NAV.map((item) => item.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('the landing statement', () => {
  it('is one or two whole sentences, never a fragment', () => {
    expect(YES_MESSAGE.length).toBeGreaterThanOrEqual(1)
    expect(YES_MESSAGE.length).toBeLessThanOrEqual(2)
    for (const sentence of YES_MESSAGE) {
      expect(sentence).toMatch(/[.!?]$/)
    }
  })

  /**
   * The statement is set at --text-body deliberately. If it ever grows into a
   * paragraph the design stops working, so cap it here rather than in review.
   */
  it('stays short enough to set small', () => {
    expect(YES_MESSAGE.join(' ').length).toBeLessThanOrEqual(160)
  })
})
