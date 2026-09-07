import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HOUSE_FIGURES } from './hacker-house'
import { HACKER_HOUSE_SUPPORT, PILLARS } from './infrastructure'

describe('the infrastructure pillars', () => {
  it('carries the owners’ four, in their order', () => {
    expect(PILLARS.map((p) => p.name)).toEqual([
      'YES',
      'Common Room',
      'SF Hacker House',
      'New Haven House',
    ])
  })

  it('states each tier’s intake', () => {
    const figures = Object.fromEntries(
      PILLARS.filter((p) => p.figure).map((p) => [p.name, p.figure!.value]),
    )

    expect(figures).toEqual({
      YES: '100',
      'Common Room': '$700M+',
      'SF Hacker House': '$17M+',
    })
  })

  /**
   * The row links to /hacker-house, so a reader meets both figures one click
   * apart. They must be the same string.
   */
  it('states the raise exactly as /hacker-house does', () => {
    const raise = PILLARS.find((p) => p.slug === 'hacker-house')?.figure?.value
    const houseFigure = HOUSE_FIGURES.find((f) => f.figure.startsWith('$'))

    expect(raise).toBe(houseFigure?.figure)
  })

  it('points every photograph at a file that exists', () => {
    for (const pillar of PILLARS) {
      expect(existsSync(join(process.cwd(), 'public', pillar.image))).toBe(true)
    }
  })

  /**
   * Two of the four have fuller pages; the headings link there rather than the
   * overview restating them. YES and the New Haven House have none, which is
   * most of the reason this page exists.
   */
  it('links only the pillars that have a page of their own', () => {
    const linked = PILLARS.filter((p) => p.href).map((p) => p.href)

    expect(linked).toEqual(['/common-room', '/hacker-house'])
  })

  /** WSJ's photographs; the society's own carry no credit. */
  it('credits the photographs it did not shoot', () => {
    for (const pillar of PILLARS) {
      if (pillar.credit) expect(pillar.credit).toBe('The Wall Street Journal')
    }
  })

  it('names every backer in the support line', () => {
    for (const backer of [
      'Caffeinated Capital',
      'Long Journey Ventures',
      'Perkins Coie',
      'HSBC Innovation Banking',
    ]) {
      expect(HACKER_HOUSE_SUPPORT).toContain(backer)
    }
  })
})
