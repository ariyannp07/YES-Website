import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { COMMON_ROOM_BIOS } from './common-room-bios'

import {
  COMMON_ROOM_LINE,
  COMMON_ROOM_PEOPLE,
  COMMON_ROOM_VALUATION,
} from './common-room'

describe('Common Room', () => {
  it('carries every portrait the owners supplied, once each', () => {
    expect(COMMON_ROOM_PEOPLE).toHaveLength(22)
    expect(new Set(COMMON_ROOM_PEOPLE.map((p) => p.slug)).size).toBe(22)
  })

  it('includes James Masson', () => {
    expect(COMMON_ROOM_PEOPLE.map((p) => p.name)).toContain('James Masson')
  })

  /**
   * founders.pdf ("Yale Hacker House - 2026 Cohort") prints a numbered order.
   * Only 8 of its 15 people have a portrait here, so it fixes the head of the
   * page and surnames order the tail.
   */
  it('opens in the order founders.pdf prints', () => {
    expect(COMMON_ROOM_PEOPLE.slice(0, 8).map((p) => p.slug)).toEqual([
      'nicolas-gertler',
      'lucas-santos',
      'oliver-hime',
      'freeman-irabaruta',
      'leia-ryan',
      'james-masson',
      'bruno-bruno',
      'murad-abdukholikov',
    ])
  })

  it('orders everyone after the cohort by surname', () => {
    const tail = COMMON_ROOM_PEOPLE.slice(9).map((p) => p.name.split(' ').at(-1)!)

    expect(tail).toEqual(
      [...tail].sort((left, right) =>
        left.toLowerCase().localeCompare(right.toLowerCase()),
      ),
    )
  })

  /** A missing file is a broken image on a page that is entirely faces. */
  it('points every portrait at a file that exists', () => {
    for (const person of COMMON_ROOM_PEOPLE) {
      expect([`/common-room/${person.slug}.jpg`, `/common-room/${person.slug}.webp`]).toContain(person.portrait)
      expect(existsSync(join(process.cwd(), 'public', person.portrait))).toBe(true)
    }
  })

  it('keeps roles short enough for a face grid', () => {
    for (const person of COMMON_ROOM_PEOPLE) {
      if (person.role) expect(person.role.length).toBeLessThanOrEqual(70)
    }
  })

  it('matches every imported biography to a member in the room', () => {
    const slugs = COMMON_ROOM_PEOPLE.map((p) => p.slug)
    expect(Object.keys(COMMON_ROOM_BIOS)).toHaveLength(9)
    for (const slug of Object.keys(COMMON_ROOM_BIOS)) expect(slugs).toContain(slug)
    expect(COMMON_ROOM_PEOPLE.find((p) => p.slug === 'ariyan-patel')?.portrait)
      .toBe('/common-room/ariyan-patel.webp')
  })

  it('preserves owner bio corrections when importing outside profiles', () => {
    for (const slug of ['oliver-hime', 'freeman-irabaruta']) {
      expect(COMMON_ROOM_BIOS[slug]).not.toMatch(/UnitZero|Neotix|Daemo|NVIDIA|Bwenge/i)
      expect(COMMON_ROOM_BIOS[slug]).toContain('Z Fellow')
    }
    expect(COMMON_ROOM_BIOS['bruno-bruno']).not.toMatch(/founder|Kesho/i)
    expect(COMMON_ROOM_BIOS['bruno-bruno']).toContain('prediction markets')
  })

  /** Owner-supplied; nothing in the repo can recompute or check it. */
  it('carries the combined valuation', () => {
    expect(COMMON_ROOM_VALUATION.figure).toBe('$700M+')
  })

  /** Owner-supplied too: he has no catalog record to read a role from. */
  it('gives Ishir Rao his role', () => {
    const ishir = COMMON_ROOM_PEOPLE.find((p) => p.slug === 'ishir-rao')

    expect(ishir?.role).toBe('Ex-Valthos, AI for Science')
  })

  it('now has a role for everyone', () => {
    expect(COMMON_ROOM_PEOPLE.filter((p) => !p.role)).toEqual([])
  })

  it('states the owners’ line', () => {
    expect(COMMON_ROOM_LINE).toBe(
      'The infrastructure behind Yale’s most successful outcomes.',
    )
  })
})
