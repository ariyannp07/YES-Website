import data from './globe-nodes.json'

/**
 * The globe's network, generated from real Earth geometry.
 *
 * Built offline by lib/landing/generate-nodes.mjs from Natural Earth's land
 * polygons and populated places, then committed. Coastlines are real and the
 * bright clusters sit on real cities, which is what makes the silhouette
 * readable as Earth rather than as abstract blobs. Neither the build nor the
 * browser needs a geo library or a network call.
 *
 * Stored as flat tuples rather than objects: at ~1600 nodes the key names would
 * be most of the payload.
 */

export interface GlobeNode {
  readonly lon: number
  readonly lat: number
  readonly x: number
  readonly y: number
  readonly z: number
  /** 0..1 — drives size and brightness. City anchors sit near the top. */
  readonly weight: number
  /** Which reveal wave this node belongs to. */
  readonly order: number
}

export interface GlobeEdge {
  readonly a: number
  readonly b: number
  readonly order: number
  readonly long: boolean
}

/** One resampled step of coastline, as two points on the unit sphere. */
export interface CoastSegment {
  readonly ax: number
  readonly ay: number
  readonly az: number
  readonly bx: number
  readonly by: number
  readonly bz: number
  readonly order: number
}

export interface GlobeModel {
  readonly nodes: readonly GlobeNode[]
  readonly edges: readonly GlobeEdge[]
  readonly coast: readonly CoastSegment[]
  readonly origin: number
  /** Highest reveal order present — how many waves the sequence has. */
  readonly waves: number
}

/** Lon/lat in degrees to a unit vector. */
export const toVector = (lon: number, lat: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return [
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ]
}

let cached: GlobeModel | null = null

export const buildGlobe = (): GlobeModel => {
  if (cached) return cached

  const raw = data as {
    nodes: number[][]
    edges: number[][]
    coast: number[][]
    origin: number
  }

  const nodes: GlobeNode[] = raw.nodes.map(([lon, lat, weight, order]) => {
    const [x, y, z] = toVector(lon, lat)
    return { lon, lat, x, y, z, weight, order }
  })

  const edges: GlobeEdge[] = raw.edges.map(([a, b, order, long]) => ({
    a,
    b,
    order,
    long: long === 1,
  }))

  const coast: CoastSegment[] = (raw.coast ?? []).map(([lon1, lat1, lon2, lat2, order]) => {
    const [ax, ay, az] = toVector(lon1, lat1)
    const [bx, by, bz] = toVector(lon2, lat2)
    return { ax, ay, az, bx, by, bz, order }
  })

  cached = {
    nodes,
    edges,
    coast,
    origin: raw.origin,
    waves: nodes.reduce((max, node) => Math.max(max, node.order), 0),
  }
  return cached
}
