/**
 * Firms with relationships across the wider YES community.
 *
 * The first group is intentionally short and reputation-led; the remainder is
 * alphabetical so the expanded directory stays easy to scan. Inclusion is not
 * a claim that a firm has invested in YES or a YES-associated company.
 */
export const featuredVcFirms = [
  {
    name: 'a16z',
    logo: '/vc/a16z.svg',
    width: 734,
    height: 261,
    format: 'stacked',
  },
  {
    name: 'General Catalyst',
    logo: '/vc/general-catalyst.svg',
    width: 312,
    height: 40,
    format: 'wide',
  },
  {
    name: 'Google Ventures',
    logo: '/vc/gv.svg',
    width: 49,
    height: 31,
    format: 'mark',
  },
  {
    name: 'Bain Capital Ventures',
    logo: '/vc/bain-capital-ventures.svg',
    width: 1377,
    height: 496,
    format: 'compact',
  },
  {
    name: 'Menlo Ventures',
    logo: '/vc/menlo-ventures.svg',
    width: 102,
    height: 40,
    format: 'standard',
  },
  {
    name: 'Battery Ventures',
    logo: '/vc/battery-ventures.svg',
    width: 561,
    height: 149,
    format: 'standard',
  },
  {
    name: '8VC',
    logo: '/vc/8vc.svg',
    width: 73,
    height: 29,
    format: 'compact',
  },
  {
    name: 'Floodgate',
    logo: '/vc/floodgate.svg',
    width: 152,
    height: 48,
    format: 'reversed',
  },
] as const

export const additionalVcFirms = [
  '645 Ventures',
  'Abstract',
  'Afore Capital',
  'AIX Ventures',
  'Caffeinated Capital',
  'CIV',
  'Cyber',
  'Dell Technologies Capital',
  'Emergence Capital',
  'Gigascale Capital',
  'Human Capital',
  'INCE Capital',
  'Liquid2 Ventures',
  'Long Journey',
  'Maverick Capital',
  'Mission Street Capital',
  'Moxxie Ventures',
  'Pantera Capital',
  'Pear VC',
  'Pebblebed VC',
  'Precursor VC',
  'Prosperity7 Ventures',
  'Rho',
  'Runa Capital',
  'Treeo VC',
  'Xfund',
  'Zetta',
] as const

export const vcFirmCount = featuredVcFirms.length + additionalVcFirms.length
