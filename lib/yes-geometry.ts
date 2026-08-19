import { createRandom } from '@/lib/seeded-random'

/**
 * Geometry for the YES mark.
 *
 * The mark is a blocked sigma carrying a low-poly network. This module holds
 * the shape and the network in DESIGN SPACE — a 100×100 box with y pointing
 * down, matching SVG — and nothing about how either is drawn. The WebGL scene
 * flips y and centres on the origin; the static fallback uses SIGMA_PATH as-is.
 *
 * The network is generated from a fixed seed at module load, so the fallback
 * and the scene agree and a rebuild never reshuffles it.
 *
 * PLACEHOLDER SILHOUETTE — traced from the mark the owners supplied, not the
 * original file. Replace SIGMA_POLYGONS when the true vector lands; the
 * extrusion and the network both adapt to whatever shape they are given.
 */

export type Point = readonly [number, number]

/** Top bar, rightward chevron, bottom bar. */
export const SIGMA_POLYGONS: readonly (readonly Point[])[] = [
  [
    [8, 10],
    [92, 10],
    [92, 27],
    [8, 27],
  ],
  [
    [8, 33],
    [44, 33],
    [80, 50],
    [44, 67],
    [8, 67],
    [44, 50],
  ],
  [
    [8, 73],
    [92, 73],
    [92, 90],
    [8, 90],
  ],
]

/** For the static, no-JavaScript fallback. */
export const SIGMA_PATH = SIGMA_POLYGONS.map(
  (polygon) => `M${polygon.map(([x, y]) => `${x},${y}`).join(' L')} Z`,
).join(' ')

/** Extrusion depth, in design units. Heavy on purpose — a thin mark reads as a decal. */
export const EXTRUDE_DEPTH = 21

export interface NetworkNode {
  readonly x: number
  readonly y: number
  /** Centred on zero, so the network straddles the extrusion. */
  readonly z: number
  readonly size: number
}

const NETWORK_SEED = 730451
const NODE_COUNT = 72
const MAX_SAMPLE_ATTEMPTS = 12000

/** Nodes closer than this in 3D get an edge. Design units. */
const EDGE_DISTANCE = 23
/** Cap the fan-out so dense clusters do not turn into solid white patches. */
const MAX_EDGES_PER_NODE = 5

/** Ray casting, used to keep every node inside the letterform. */
const insidePolygon = (x: number, y: number, polygon: readonly Point[]): boolean => {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    const straddles = yi > y !== yj > y
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

const insideSigma = (x: number, y: number): boolean =>
  SIGMA_POLYGONS.some((polygon) => insidePolygon(x, y, polygon))

const buildNodes = (): readonly NetworkNode[] => {
  const random = createRandom(NETWORK_SEED)
  const nodes: NetworkNode[] = []

  for (
    let attempt = 0;
    attempt < MAX_SAMPLE_ATTEMPTS && nodes.length < NODE_COUNT;
    attempt += 1
  ) {
    const x = random() * 100
    const y = random() * 100
    const depth = random()
    const size = random()

    if (!insideSigma(x, y)) continue

    nodes.push({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      // Reaches past the faces at both ends, so the network threads through the
      // solid and carries on clear of it rather than sitting on its surfaces.
      z: Number(((depth - 0.5) * EXTRUDE_DEPTH * 2.3).toFixed(3)),
      size: Number((0.55 + size * 0.75).toFixed(3)),
    })
  }

  return nodes
}

/** Index pairs, ready to flatten into a LineSegments buffer. */
const buildEdges = (
  nodes: readonly NetworkNode[],
): readonly (readonly [number, number])[] => {
  const pairs: { a: number; b: number; distance: number }[] = []

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dz = nodes[j].z - nodes[i].z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (distance <= EDGE_DISTANCE) pairs.push({ a: i, b: j, distance })
    }
  }

  // Shortest first, so the network reads as nearest-neighbour structure rather
  // than an arbitrary tangle once the per-node cap starts rejecting edges.
  pairs.sort((left, right) => left.distance - right.distance)

  const degree = new Map<number, number>()
  const edges: (readonly [number, number])[] = []

  for (const pair of pairs) {
    const degreeA = degree.get(pair.a) ?? 0
    const degreeB = degree.get(pair.b) ?? 0
    if (degreeA >= MAX_EDGES_PER_NODE || degreeB >= MAX_EDGES_PER_NODE) continue

    degree.set(pair.a, degreeA + 1)
    degree.set(pair.b, degreeB + 1)
    edges.push([pair.a, pair.b])
  }

  return edges
}

export const NETWORK_NODES = buildNodes()
export const NETWORK_EDGES = buildEdges(NETWORK_NODES)
