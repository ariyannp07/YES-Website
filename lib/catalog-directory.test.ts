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
  it('contains exactly the confirmed owner-curated roster and labels', () => {
    const confirmed = directoryPeople().filter(
      (person) => person.directoryStatus !== 'uncertain',
    )

    expect(confirmed.map(({ name, directoryRole }) => [name, directoryRole])).toEqual(EXPECTED)
  })

  it('uses the approved first-row profile titles', () => {
    const people = directoryPeople()

    expect(people.find((person) => person.name === 'Sofia Teifeld')?.nowLine).toBe(
      'Co-President, Yale Entrepreneurial Society',
    )
    expect(people.find((person) => person.name === 'Kashi Tuteja')?.nowLine).toBe(
      'Machine Learning Researcher',
    )
  })

  it('publishes uncertain records without their unverified profile details', () => {
    const people = directoryPeople()
    const uncertain = people.filter((person) => person.directoryStatus === 'uncertain')
    const leia = uncertain.find((person) => person.name === 'Leïa Ryan')

    expect(people).toHaveLength(102)
    expect(uncertain).toHaveLength(83)
    expect(leia).toMatchObject({
      name: 'Leïa Ryan',
      nowLine: 'Co-founder, Cortex',
      directoryStatus: 'uncertain',
    })
    expect(leia).not.toHaveProperty('directoryRole')
    expect(leia).not.toHaveProperty('bio')
    expect(leia).not.toHaveProperty('venture')
    expect(leia).not.toHaveProperty('linkedinUrl')
    expect(leia).not.toHaveProperty('companyUrl')
    expect(leia).not.toHaveProperty('sectors')
  })

  it('suppresses YES-associated titles for uncertain records', () => {
    const uncertain = directoryPeople().filter(
      (person) => person.directoryStatus === 'uncertain',
    )
    const aris = uncertain.find((person) => person.name === 'Ari Strober')
    const miles = uncertain.find((person) => person.name === 'Miles Lasater')

    expect(aris?.nowLine).toBe('Directory listing')
    expect(aris?.searchText).not.toMatch(/entrepreneurial society|\byes\b/i)
    expect(aris?.searchText).not.toMatch(/uncertain/i)
    expect(miles?.nowLine).toBe('Entrepreneur / investor; co-founder of Higher One')
    expect(miles?.searchText).not.toMatch(/\byes\b/i)
  })
})
