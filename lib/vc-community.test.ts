import { describe, expect, it } from 'vitest'

import {
  additionalVcFirms,
  featuredVcFirms,
  vcFirmCount,
} from './vc-community'

describe('VC community roster', () => {
  it('keeps all 35 firms unique', () => {
    const firms = [...featuredVcFirms, ...additionalVcFirms]

    expect(firms).toHaveLength(35)
    expect(new Set(firms).size).toBe(35)
    expect(vcFirmCount).toBe(35)
  })

  it('keeps the expanded roster alphabetical', () => {
    expect(additionalVcFirms).toEqual(
      [...additionalVcFirms].sort((left, right) => left.localeCompare(right)),
    )
  })
})
