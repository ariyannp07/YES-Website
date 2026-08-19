import { createRandom } from '@/lib/seeded-random'
import { SIGMA_POLYGONS, type Point } from '@/lib/yes-geometry'

/**
 * CONCEPT 1 — THE SIGNAL. Network model.
 *
 * Geometry only; nothing here knows about canvases or frames. Positions live in
 * a normalised [0,1]² space and are scaled to the viewport at draw time, so a
 * resize never rebuilds the network and the layout is identical every load.
 *
 * The sigma is present as a DENSITY, not a drawing. Roughly half the nodes are
 * sampled inside the mark's polygons and carry a slightly higher ambient floor,
 * so as the field reveals itself the shape emerges from where the network is
 * thickest — the viewer half-recognises it without a logo ever appearing.
 */

export const DISCIPLINES = [
  'ROBOTICS',
  'BIOTECH',
  'FILM',
  'CLIMATE',
  'AI',
  'ARCHITECTURE',
  'ENERGY',
  'HARDWARE',
  'CONSUMER',
  'POLICY',
] as const

export type Discipline = (typeof DISCIPLINES)[number]

/**
 * Collisions the network occasionally proposes. The brief's examples used
 * "BIOLOGY"; the label set says BIOTECH, so it is spelled that way here for
 * consistency with the nodes actually on screen.
 */
export const CROSSES: readonly (readonly [Discipline, Discipline])[] = [
  ['BIOTECH', 'HARDWARE'],
  ['ENERGY', 'POLICY'],
  ['FILM', 'AI'],
  ['ROBOTICS', 'CLIMATE'],
  ['ARCHITECTURE', 'CONSUMER'],
  ['AI', 'POLICY'],
  ['HARDWARE', 'CLIMATE'],
]

/**
 * The only concrete claims in this concept, and every one of them is canonical
 * — canon/01-vision-brief.md, PROOF OF POTENTIAL. Nothing about a node is
 * invented (build spec §8.5).
 */
export interface Anchor {
  readonly figure: string
  readonly context: string
}

export const ANCHORS: readonly Anchor[] = [
  { figure: '14', context: 'teams. One house. One summer.' },
  { figure: '$17M+', context: 'raised by five of them, already.' },
  { figure: '$600M+', context: 'Prepared, after reaching ~100M Americans.' },
  { figure: '$3.3B', context: 'Spring Health, serving 20M people.' },
]

export interface SignalNode {
  /** Normalised viewport coordinates. */
  readonly nx: number
  readonly ny: number
  /** Sampled from inside the mark, so it carries a higher ambient floor. */
  readonly inSigma: boolean
  readonly label?: Discipline
  readonly anchor?: Anchor
  readonly seedPhase: number
}

export type SignalEdge = readonly [number, number]

const SEED = 41207
const SIGMA_COUNT = 86
const SCATTER_COUNT = 66
const MAX_ATTEMPTS = 20000

/** The mark occupies this fraction of the viewport, centred. */
const SIGMA_WIDTH = 0.44
const SIGMA_HEIGHT = 0.5

/** Edges connect nodes closer than this in normalised space. */
const EDGE_RADIUS = 0.115
const MAX_DEGREE = 4

const insidePolygon = (x: number, y: number, polygon: readonly Point[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const insideSigma = (x: number, y: number): boolean =>
  SIGMA_POLYGONS.some((polygon) => insidePolygon(x, y, polygon))

/** Design space (0..100, y down) → normalised viewport. */
const toNormalised = (x: number, y: number): readonly [number, number] => [
  0.5 + ((x - 50) / 100) * SIGMA_WIDTH,
  0.5 + ((y - 50) / 100) * SIGMA_HEIGHT,
]

export const buildSignalNetwork = (): {
  readonly nodes: readonly SignalNode[]
  readonly edges: readonly SignalEdge[]
} => {
  const random = createRandom(SEED)
  const raw: { nx: number; ny: number; inSigma: boolean; seedPhase: number }[] = []

  // Inside the mark.
  for (let i = 0; i < MAX_ATTEMPTS && raw.length < SIGMA_COUNT; i += 1) {
    const x = random() * 100
    const y = random() * 100
    if (!insideSigma(x, y)) continue
    const [nx, ny] = toNormalised(x, y)
    raw.push({ nx, ny, inSigma: true, seedPhase: random() * Math.PI * 2 })
  }

  // Everywhere else, kept off the extreme edges.
  while (raw.length < SIGMA_COUNT + SCATTER_COUNT) {
    const nx = 0.04 + random() * 0.92
    const ny = 0.06 + random() * 0.88
    const [sx, sy] = [
      ((nx - 0.5) / SIGMA_WIDTH) * 100 + 50,
      ((ny - 0.5) / SIGMA_HEIGHT) * 100 + 50,
    ]
    // Keep the interior sparse so the density difference stays legible.
    if (insideSigma(sx, sy) && random() > 0.25) continue
    raw.push({ nx, ny, inSigma: false, seedPhase: random() * Math.PI * 2 })
  }

  // Spread the discipline labels: each one goes to the candidate furthest from
  // every label already placed, so no two words end up stacked.
  const labelled = new Map<number, Discipline>()
  DISCIPLINES.forEach((discipline) => {
    let bestIndex = -1
    let bestScore = -1

    raw.forEach((node, index) => {
      if (labelled.has(index)) return
      let nearest = Number.POSITIVE_INFINITY
      for (const takenIndex of labelled.keys()) {
        const other = raw[takenIndex]
        nearest = Math.min(
          nearest,
          Math.hypot(node.nx - other.nx, node.ny - other.ny),
        )
      }
      const score = labelled.size === 0 ? node.nx + node.ny : nearest
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    if (bestIndex >= 0) labelled.set(bestIndex, discipline)
  })

  // Anchors go to unlabelled interior nodes, well apart.
  const anchored = new Map<number, Anchor>()
  ANCHORS.forEach((anchor, order) => {
    let bestIndex = -1
    let bestScore = -1
    raw.forEach((node, index) => {
      if (labelled.has(index) || anchored.has(index) || !node.inSigma) return
      let nearest = Number.POSITIVE_INFINITY
      for (const takenIndex of anchored.keys()) {
        const other = raw[takenIndex]
        nearest = Math.min(
          nearest,
          Math.hypot(node.nx - other.nx, node.ny - other.ny),
        )
      }
      const score = anchored.size === 0 ? (order + node.ny) % 1 : nearest
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })
    if (bestIndex >= 0) anchored.set(bestIndex, anchor)
  })

  const nodes: SignalNode[] = raw.map((node, index) => ({
    nx: node.nx,
    ny: node.ny,
    inSigma: node.inSigma,
    seedPhase: node.seedPhase,
    label: labelled.get(index),
    anchor: anchored.get(index),
  }))

  // Nearest-neighbour edges, shortest first, with a degree cap so dense pockets
  // do not turn into solid webs.
  const pairs: { a: number; b: number; d: number }[] = []
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const d = Math.hypot(nodes[i].nx - nodes[j].nx, nodes[i].ny - nodes[j].ny)
      if (d <= EDGE_RADIUS) pairs.push({ a: i, b: j, d })
    }
  }
  pairs.sort((left, right) => left.d - right.d)

  const degree = new Map<number, number>()
  const edges: SignalEdge[] = []
  for (const pair of pairs) {
    const da = degree.get(pair.a) ?? 0
    const db = degree.get(pair.b) ?? 0
    if (da >= MAX_DEGREE || db >= MAX_DEGREE) continue
    degree.set(pair.a, da + 1)
    degree.set(pair.b, db + 1)
    edges.push([pair.a, pair.b])
  }

  return { nodes, edges }
}

/** Index of the labelled node carrying a discipline, for the cross events. */
export const findLabelIndex = (
  nodes: readonly SignalNode[],
  label: Discipline,
): number => nodes.findIndex((node) => node.label === label)
