import { describe, expect, it } from 'vitest'

import {
  additionalVcFirms,
  featuredVcFirms,
  vcFirmCount,
} from './vc-community'

describe('VC community roster', () => {
  it('keeps all 38 firms unique', () => {
    const firms = [
      ...featuredVcFirms.map((firm) => firm.name),
      ...additionalVcFirms,
    ]

    expect(firms).toHaveLength(38)
    expect(new Set(firms).size).toBe(38)
    expect(vcFirmCount).toBe(38)
    expect(additionalVcFirms).toEqual(
      expect.arrayContaining(['OpenAI', 'GMI', 'ElevenLabs', 'SpaceXAI']),
    )
    expect(additionalVcFirms).not.toContain('INCE Capital')
  })

  it('keeps the expanded roster alphabetical', () => {
    expect(additionalVcFirms).toEqual(
      [...additionalVcFirms].sort((left, right) => left.localeCompare(right)),
    )
  })
})
