import { createRandom } from '@/lib/seeded-random'

/**
 * Geometry for the YES mark.
 *
 * The mark is a blocked sigma carrying a low-poly network. Earlier versions
 * painted that network flat onto the front and back faces, which produced two
 * disagreeing pictures of the same object — read as an X through the middle
 * when it turned. Here the network is real 3D: every node has an (x, y, z)
 * inside the mark's volume and every edge is a segment placed in space, so the
 * white lines run continuously front to back and stay consistent from any
 * angle.
 *
 * Everything is computed from a fixed seed at module load, so the server and
 * the browser produce identical geometry and nothing ships to the client but
 * the resulting transforms.
 *
 * PLACEHOLDER SILHOUETTE — traced from the mark the owners supplied, not the
 * original file. Replace SIGMA_POLYGONS (and SIGMA_PATH) when the true vector
 * lands; the network adapts to whatever shape it is given.
 */

/** Design space is 100×100; the scene renders it at SCENE_PX. */
export const SCENE_PX = 248
/** Extrusion depth. Deliberately heavy — a thin mark reads as a decal. */
export const DEPTH_PX = 58

const UNIT = SCENE_PX / 100

type Point = readonly [number, number]

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

export const SIGMA_PATH = SIGMA_POLYGONS.map(
  (polygon) =>
    `M${polygon.map(([x, y]) => `${x},${y}`).join(' L')} Z`,
).join(' ')

/** Ray casting. Used to keep every node inside the letterform. */
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

/** Independent opacity cycle, so the network reads as alive rather than rigid. */
export interface Twinkle {
  readonly durationSec: number
  readonly delaySec: number
}

export interface Node extends Twinkle {
  /** Scene pixels, origin at the mark's top-left. */
  readonly x: number
  readonly y: number
  readonly z: number
  readonly size: number
}

export interface Edge extends Twinkle {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly length: number
  /** Degrees. Rotation in the XY plane. */
  readonly yaw: number
  /** Degrees. Lift out of the XY plane, toward the viewer. */
  readonly pitch: number
  readonly opacity: number
}

const NETWORK_SEED = 730451
const NODE_COUNT = 74
const MAX_SAMPLE_ATTEMPTS = 9000

/** Nodes closer than this in 3D get an edge. Scene pixels. */
const EDGE_DISTANCE = 58
/** Cap the fan-out so dense clusters do not turn into solid white patches. */
const MAX_EDGES_PER_NODE = 5

const buildNodes = (): readonly Node[] => {
  const random = createRandom(NETWORK_SEED)
  const nodes: Node[] = []

  for (
    let attempt = 0;
    attempt < MAX_SAMPLE_ATTEMPTS && nodes.length < NODE_COUNT;
    attempt += 1
  ) {
    const designX = random() * 100
    const designY = random() * 100
    const depth = random()
    const size = random()

    if (!insideSigma(designX, designY)) continue

    nodes.push({
      x: Number((designX * UNIT).toFixed(2)),
      y: Number((designY * UNIT).toFixed(2)),
      // Well beyond the solid at both ends, so the network threads through the
      // body and dances clear of it front and back rather than sitting on its
      // faces.
      z: Number(((depth - 0.5) * (DEPTH_PX * 2.1)).toFixed(2)),
      size: Number((1.5 + size * 2).toFixed(2)),
      durationSec: Number((5 + random() * 9).toFixed(1)),
      delaySec: Number((-random() * 14).toFixed(1)),
    })
  }

  return nodes
}

const buildEdges = (nodes: readonly Node[]): readonly Edge[] => {
  const edges: Edge[] = []
  const degree = new Map<number, number>()

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
  // than as an arbitrary tangle once the per-node cap starts rejecting edges.
  pairs.sort((left, right) => left.distance - right.distance)

  for (const pair of pairs) {
    const degreeA = degree.get(pair.a) ?? 0
    const degreeB = degree.get(pair.b) ?? 0
    if (degreeA >= MAX_EDGES_PER_NODE || degreeB >= MAX_EDGES_PER_NODE) continue

    degree.set(pair.a, degreeA + 1)
    degree.set(pair.b, degreeB + 1)

    const from = nodes[pair.a]
    const to = nodes[pair.b]

    const dx = to.x - from.x
    const dy = to.y - from.y
    const dz = to.z - from.z
    const length = pair.distance

    // Place a flat segment, then aim it: rotateZ swings it within the XY
    // plane, rotateY lifts it out toward the viewer. Derived so that the
    // segment's local X axis lands exactly on (dx, dy, dz).
    const yaw = (Math.atan2(dy, dx) * 180) / Math.PI
    const pitch = (-Math.asin(dz / length) * 180) / Math.PI

    edges.push({
      x: from.x,
      y: from.y,
      z: from.z,
      length: Number(length.toFixed(2)),
      yaw: Number(yaw.toFixed(2)),
      pitch: Number(pitch.toFixed(2)),
      // Longer spans read as structure; short ones would otherwise crowd.
      opacity: Number((0.92 - (length / EDGE_DISTANCE) * 0.34).toFixed(2)),
      // Derived from the endpoints rather than drawn from the RNG, so edge
      // timing stays stable when the node count changes.
      durationSec: Number((6 + ((pair.a * 7 + pair.b * 13) % 90) / 10).toFixed(1)),
      delaySec: -Number((((pair.a * 11 + pair.b * 5) % 160) / 10).toFixed(1)),
    })
  }

  return edges
}

export const NODES = buildNodes()
export const EDGES = buildEdges(NODES)
