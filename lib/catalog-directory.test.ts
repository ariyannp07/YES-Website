import { describe, expect, it } from 'vitest'

import { directoryPeople } from './catalog-directory'

const EXPECTED = [
  ['Oliver Hime', 'Former Board'],
  ['Mateo Sanchez', 'Member of YES'],
  ['Matei Coldea', 'Member of YES'],
  ['Jeremy Rodrigues', 'Member of YES'],
  ['Freeman Iraburata', 'Member of YES'],
  ['Cagri Dirik', 'Member of Board'],
  ['Osama Radi', 'Member of YES'],
  ['Kashi Tuteja', 'Member of Board'],
  ['Ishir Rao', 'Member of YES'],
  ['Soleil Wizman', 'Former Board'],
  ['Vinesh Kothari', 'Former Board'],
  ['Ariyan Patel', 'Member of Board'],
  ['Sofia Teifeld', 'Member of Board'],
  ['Zain Anwar', 'Member of Board'],
  ['Sina Dehghani', 'Member of Board'],
  ['Lucas Santos', 'Member of Board'],
  ['Nicolas Gertler', 'Member of Board'],
  ['Seth Goldin', 'Former Board'],
  ['Amelie Liu', 'Former Board'],
] as const

describe('public People directory', () => {
  it('contains exactly the owner-curated roster and labels', () => {
    expect(directoryPeople().map(({ name, directoryRole }) => [name, directoryRole])).toEqual(
      EXPECTED,
    )
  })

  it('does not expose deprecated stored records', () => {
    const publicNames = new Set(directoryPeople().map((person) => person.name))

    expect(publicNames.size).toBe(19)
    expect(publicNames.has('Leïa Ryan')).toBe(false)
    expect(publicNames.has('James Masson')).toBe(false)
  })
})
