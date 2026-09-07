import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { vcFirmCount, vcFirms } from './vc-community'

const names = () => vcFirms.map((firm) => firm.name)

describe('VC community roster', () => {
  it('is exactly what the landing renders, all unique', () => {
    expect(vcFirms).toHaveLength(28)
    expect(new Set(names()).size).toBe(28)
    expect(vcFirmCount).toBe(28)
  })

  /**
   * These arrived as logo files after shipping as bare names. 'SpaceXAI' was one
   * roster entry and turned out to be two firms — the owners' logo folder holds
   * SpaceX and xAI separately — so it was split, and xAI then dropped.
   */
  it('renders the firms that used to be name-only', () => {
    expect(names()).toEqual(
      expect.arrayContaining(['OpenAI', 'GMI Cloud', 'ElevenLabs', 'SpaceX', 'Deel']),
    )
    expect(names()).not.toContain('SpaceXAI')
    expect(names()).not.toContain('GMI')
  })

  /** Dropped at owner direction; their files went with them. */
  it('no longer carries the firms that were removed', () => {
    for (const gone of [
      'INCE Capital', 'Rho', 'Precursor VC', 'Runa Capital', 'Treeo VC',
      'Moxxie Ventures', '645 Ventures', 'Zetta', 'xAI',
      // Solid-shape marks: the row flattens every logo to a white silhouette,
      // and a filled circle or square flattens to a featureless block.
      'Cyber', 'Xfund',
      // No logo to show, so no longer carried at all.
      'Mission Street Capital', 'Prosperity7 Ventures',
    ]) {
      expect(names()).not.toContain(gone)
    }
  })

  /**
   * The row renders every one of these, so a path typo is a blank gap on the
   * landing rather than a build error.
   */
  it('points every firm at a logo file that is actually in public/', () => {
    for (const firm of vcFirms) {
      expect(firm.logo.startsWith('/vc/')).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', firm.logo))).toBe(true)
    }
  })

  /**
   * Marks are sized by height in CSS, and an image with no intrinsic size
   * collapses to nothing — which is how five logos once rendered at 0x0.
   */
  it('carries real intrinsic dimensions for every logo', () => {
    for (const firm of vcFirms) {
      expect(firm.width).toBeGreaterThan(0)
      expect(firm.height).toBeGreaterThan(0)
    }
  })

  it('leads with the reputation-led eight', () => {
    expect(names().slice(0, 8)).toEqual([
      'a16z', 'General Catalyst', 'Google Ventures', 'Bain Capital Ventures',
      'Menlo Ventures', 'Battery Ventures', '8VC', 'Floodgate',
    ])
  })

  it('keeps everything after the lead eight alphabetical', () => {
    const rest = names().slice(8)

    expect(rest).toEqual(
      [...rest].sort((left, right) =>
        left.toLowerCase().localeCompare(right.toLowerCase()),
      ),
    )
  })

  it('has no orphaned logo files left in public/vc', () => {
    const referenced = new Set(vcFirms.map((firm) => firm.logo.replace('/vc/', '')))
    const onDisk = require('node:fs')
      .readdirSync(join(process.cwd(), 'public', 'vc'))
      .filter((file: string) => !file.startsWith('.'))

    expect([...onDisk].sort()).toEqual([...referenced].sort())
  })
})
