import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HOUSE_APPROVED, HOUSE_FIGURES, HOUSE_PHOTOS } from './hacker-house'

describe('Hacker House', () => {
  /** The layout is a triptych: three verticals side by side, figures beneath. */
  it('carries exactly three photographs', () => {
    expect(HOUSE_PHOTOS).toHaveLength(3)
  })

  it('holds every photograph in the same 3:4 vertical', () => {
    for (const photo of [...HOUSE_PHOTOS]) {
      expect(photo.width / photo.height).toBeCloseTo(3 / 4, 2)
    }
  })

  it('points every image at a file that exists', () => {
    for (const photo of HOUSE_PHOTOS) {
      expect(existsSync(join(process.cwd(), 'public', photo.src))).toBe(true)
    }
  })

  /** Signed off by the owners on 2026-09-06; the draft banner is gone. */
  it('ships approved, so no draft notice renders', () => {
    expect(HOUSE_APPROVED).toBe(true)
  })

  /** They are the Journal's photographs; none may render unattributed. */
  it('credits every photograph', () => {
    for (const photo of HOUSE_PHOTOS) {
      expect(photo.credit).toBeTruthy()
    }
  })

  it('keeps the figures traceable to the vision brief', () => {
    expect(HOUSE_FIGURES.map((f) => f.figure)).toEqual(['14', '$17M+'])
  })
})
