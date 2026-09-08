/**
 * Firms with relationships across the wider YES community.
 *
 * The first five are reputation-led and keep the head of the row; the rest are
 * alphabetical so the line stays scannable. Inclusion is not a claim that a
 * firm has invested in YES or a YES-associated company.
 *
 * THE ROSTER IS NOW EXACTLY WHAT RENDERS. The landing used to show eight marks
 * and hide thirty names behind a "see more" disclosure; the owners asked for the
 * marks themselves, then for the disclosure to go. A firm with no logo to show
 * is no longer carried at all, so this list and the row on the landing are the
 * same set.
 *
 * Dimensions are the files' own intrinsic sizes, read from each SVG's viewBox
 * or each raster's pixels — they are not design decisions, and the row sizes
 * marks by height in CSS regardless. They exist so the browser reserves the
 * right box before the image loads.
 */

export interface VcFirm {
  readonly name: string
  readonly logo: string
  readonly width: number
  readonly height: number
  /** Rendered as authored instead of flattened to a white silhouette. */
  readonly reversed?: boolean
}

export const vcFirms: readonly VcFirm[] = [
  {
    name: 'a16z',
    logo: '/vc/a16z.svg',
    width: 734,
    height: 261,
  },
  {
    name: 'Bain Capital Ventures',
    logo: '/vc/bain-capital-ventures.svg',
    width: 88,
    height: 32,
  },
  {
    name: 'Battery Ventures',
    logo: '/vc/battery-ventures.svg',
    width: 561,
    height: 149,
  },
  {
    name: '8VC',
    logo: '/vc/8vc.svg',
    width: 73,
    height: 29,
  },
  {
    name: 'Floodgate',
    logo: '/vc/floodgate.svg',
    width: 152,
    height: 48,
    reversed: true,
  },
  {
    name: 'Abstract',
    logo: '/vc/abstract.svg',
    width: 180,
    height: 34,
  },
  {
    name: 'Afore Capital',
    logo: '/vc/afore-capital.webp',
    width: 611,
    height: 243,
  },
  {
    name: 'Caffeinated Capital',
    logo: '/vc/caffeinated-capital.svg',
    width: 204,
    height: 32,
  },
  {
    name: 'CIV',
    logo: '/vc/civ.svg',
    width: 118,
    height: 54,
  },
  {
    name: 'Deel',
    logo: '/vc/deel.png',
    width: 3240,
    height: 1255,
  },
  {
    name: 'ElevenLabs',
    logo: '/vc/elevenlabs.png',
    width: 3240,
    height: 630,
  },
  {
    name: 'Gigascale Capital',
    logo: '/vc/gigascale-capital.svg',
    width: 568,
    height: 176,
  },
  {
    name: 'GMI Cloud',
    logo: '/vc/gmi-cloud.png',
    width: 3240,
    height: 913,
  },
  {
    name: 'Human Capital',
    logo: '/vc/human-capital.svg',
    width: 32,
    height: 15,
  },
  {
    name: 'Liquid2 Ventures',
    logo: '/vc/liquid2-ventures.svg',
    width: 1780,
    height: 315,
  },
  {
    name: 'Long Journey',
    logo: '/vc/long-journey.png',
    width: 1500,
    height: 328,
  },
  {
    name: 'Pebblebed VC',
    logo: '/vc/pebblebed.svg',
    width: 118,
    height: 18,
  },
  {
    name: 'SpaceX',
    logo: '/vc/spacex.png',
    width: 3240,
    height: 608,
  },
] as const

export const vcFirmCount = vcFirms.length
