/**
 * Coarse continental outlines, as [longitude, latitude] rings.
 *
 * Deliberately low-fidelity. The globe is a constellation, not a map: nodes are
 * sampled INSIDE these rings so the silhouettes read as Earth at a glance, then
 * the eye is meant to move on to the network. Adding coastline detail here
 * would cost bytes and buy nothing — at the sizes this renders, a hundred extra
 * vertices are sub-pixel.
 *
 * Antarctica is omitted on purpose: it rings the pole, so it samples into a
 * dense band that reads as a rendering artifact rather than a continent.
 */

export interface Region {
  readonly id: string
  readonly label: string
  /** Order in which regions come online during the reveal. */
  readonly order: number
  readonly rings: readonly (readonly (readonly [number, number])[])[]
}

export const REGIONS: readonly Region[] = [
  {
    id: 'north-america',
    label: 'North America',
    order: 0,
    rings: [
      [
        [-168, 65], [-156, 71], [-133, 69], [-114, 69], [-95, 70], [-81, 73],
        [-63, 66], [-55, 52], [-66, 48], [-70, 42], [-75, 36], [-81, 31],
        [-80, 25], [-84, 30], [-91, 29], [-97, 26], [-105, 21], [-110, 24],
        [-114, 31], [-121, 35], [-125, 43], [-131, 53], [-141, 60], [-155, 59],
        [-168, 65],
      ],
    ],
  },
  {
    id: 'south-america',
    label: 'South America',
    order: 4,
    rings: [
      [
        [-81, 8], [-72, 12], [-62, 11], [-52, 5], [-44, -2], [-35, -6],
        [-38, -14], [-42, -23], [-48, -28], [-58, -35], [-63, -42], [-68, -50],
        [-72, -54], [-75, -47], [-73, -37], [-71, -25], [-70, -18], [-76, -10],
        [-81, -4], [-81, 8],
      ],
    ],
  },
  {
    id: 'europe',
    label: 'Europe',
    order: 1,
    rings: [
      [
        [-10, 43], [-9, 52], [-5, 58], [4, 61], [12, 66], [22, 70], [31, 70],
        [40, 66], [46, 58], [42, 50], [36, 45], [28, 41], [22, 40], [14, 38],
        [9, 41], [3, 42], [-3, 43], [-10, 43],
      ],
    ],
  },
  {
    id: 'africa',
    label: 'Africa',
    order: 3,
    rings: [
      [
        [-17, 21], [-16, 28], [-6, 36], [10, 37], [25, 32], [34, 31], [43, 12],
        [51, 12], [41, -1], [40, -15], [35, -24], [26, -34], [18, -34],
        [12, -18], [9, -1], [3, 6], [-8, 5], [-14, 12], [-17, 21],
      ],
    ],
  },
  {
    id: 'asia',
    label: 'Asia',
    order: 2,
    rings: [
      [
        [46, 58], [60, 70], [80, 74], [104, 78], [130, 73], [145, 70],
        [160, 70], [172, 66], [162, 60], [155, 52], [142, 46], [130, 43],
        [127, 35], [121, 31], [117, 24], [108, 21], [100, 13], [95, 16],
        [89, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [51, 30],
        [45, 38], [42, 50], [46, 58],
      ],
    ],
  },
  {
    id: 'oceania',
    label: 'Oceania',
    order: 5,
    rings: [
      [
        [114, -22], [122, -18], [130, -12], [137, -12], [143, -12], [146, -19],
        [150, -25], [153, -28], [150, -37], [143, -39], [135, -35], [129, -32],
        [118, -35], [114, -28], [114, -22],
      ],
      // New Zealand, as a small companion cluster.
      [
        [166, -46], [171, -44], [174, -41], [178, -38], [175, -37], [172, -40],
        [168, -44], [166, -46],
      ],
    ],
  },
]

/** Ray-casting point-in-polygon, in lon/lat space. */
export const inRing = (
  lon: number,
  lat: number,
  ring: readonly (readonly [number, number])[],
): boolean => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const straddles = yi > lat !== yj > lat
    if (straddles && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export const regionAt = (lon: number, lat: number): Region | null => {
  for (const region of REGIONS) {
    for (const ring of region.rings) {
      if (inRing(lon, lat, ring)) return region
    }
  }
  return null
}

/** The ignition point. Everything in the reveal builds toward this. */
export const NEW_HAVEN = { lon: -72.93, lat: 41.31 } as const
