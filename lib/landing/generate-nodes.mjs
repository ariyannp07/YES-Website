/**
 * Generates the globe's node field from real Earth geometry.
 *
 *   node lib/landing/generate-nodes.mjs
 *
 * Writes lib/landing/globe-nodes.json. Run it only when the look needs to
 * change; the output is committed so neither the build nor the browser depends
 * on a network fetch or a geo library.
 *
 * The reference is Earth at night: dark landmasses picked out by city light,
 * dense where people are and sparse where they are not. So the field is built
 * in two passes — a faint scatter over land for the silhouette, and bright
 * clusters around real cities weighted by population for the constellation.
 * Uniform sampling alone gives a flat speckle that reads as noise, not a planet.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const LAND =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
const PLACES =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places_simple.geojson'

const LAND_DOTS = 950
const CITY_DOTS = 620
const LOCAL_LINKS = 2
const LONG_LINKS = 26

/** Deterministic PRNG, so the field is a design decision and not a lottery. */
const mulberry = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const random = mulberry(0x59455332)

/**
 * Reveal order. North America first because that is where the story starts,
 * then outward. Boxes are coarse and checked in this order, so the overlaps
 * (Europe/Asia at the Urals, Asia/Oceania through Indonesia) resolve by
 * priority rather than by a border nobody will look for.
 */
const REGIONS = [
  { id: 'north-america', order: 0, lon: [-170, -52], lat: [7, 84] },
  { id: 'europe', order: 1, lon: [-25, 40], lat: [36, 72] },
  { id: 'asia', order: 2, lon: [25, 180], lat: [5, 78] },
  { id: 'africa', order: 3, lon: [-18, 52], lat: [-36, 37] },
  { id: 'south-america', order: 4, lon: [-82, -34], lat: [-56, 13] },
  { id: 'oceania', order: 5, lon: [110, 180], lat: [-50, 5] },
]

const regionOf = (lon, lat) => {
  for (const r of REGIONS) {
    if (lon >= r.lon[0] && lon <= r.lon[1] && lat >= r.lat[0] && lat <= r.lat[1]) return r
  }
  // Everything else (island chains, the far Pacific) joins the last wave.
  return REGIONS[5]
}

const pointInRing = (lon, lat, ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const polygons = (geo) => {
  const out = []
  for (const feature of geo.features) {
    const g = feature.geometry
    if (!g) continue
    const parts = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    for (const poly of parts) out.push(poly)
  }
  return out
}

/** A polygon is [outerRing, ...holes]; a point counts only if outside holes. */
const onLand = (lon, lat, polys) => {
  for (const poly of polys) {
    if (!pointInRing(lon, lat, poly[0])) continue
    let inHole = false
    for (let h = 1; h < poly.length; h += 1) {
      if (pointInRing(lon, lat, poly[h])) { inHole = true; break }
    }
    if (!inHole) return true
  }
  return false
}

const main = async () => {
  const [landGeo, placeGeo] = await Promise.all(
    [LAND, PLACES].map((u) => fetch(u).then((r) => r.json())),
  )
  const polys = polygons(landGeo)

  const nodes = []
  const push = (lon, lat, weight) => {
    const order = regionOf(lon, lat).order
    nodes.push([
      Number(lon.toFixed(3)),
      Number(lat.toFixed(3)),
      Number(weight.toFixed(3)),
      order,
    ])
  }

  // New Haven is index 0, always — the reveal is built around it existing.
  push(-72.93, 41.31, 1)

  // Pass 1 — the silhouette. asin() keeps density even on the sphere rather
  // than crowding the poles the way uniform latitude would.
  let guard = 0
  while (nodes.length < LAND_DOTS && guard < 400_000) {
    guard += 1
    const lon = random() * 360 - 180
    const lat = (Math.asin(random() * 2 - 1) * 180) / Math.PI
    if (lat > 83 || lat < -60) continue // Antarctica reads as a rendering bug
    if (!onLand(lon, lat, polys)) continue
    push(lon, lat, 0.14 + random() * 0.16)
  }

  // Pass 2 — city light. Population sets both how many dots a place gets and
  // how bright they are, which is what produces the eastern-seaboard and
  // European density in the reference images.
  const cities = placeGeo.features
    .map((f) => ({
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      pop: f.properties.pop_max ?? 0,
    }))
    .filter((c) => c.pop > 0 && c.lat < 83 && c.lat > -60)
    .sort((a, b) => b.pop - a.pop)

  const maxPop = cities[0]?.pop ?? 1
  const budget = CITY_DOTS
  let placed = 0
  for (const city of cities) {
    if (placed >= budget) break
    const scale = Math.log10(city.pop) / Math.log10(maxPop) // 0..1, compressed
    const count = Math.max(1, Math.round(scale * scale * 9))
    // The metro itself: one bright anchor.
    push(city.lon, city.lat, 0.55 + scale * 0.45)
    placed += 1
    // Its sprawl: a tight halo, tighter for smaller places.
    const spread = 0.8 + scale * 2.6
    for (let i = 1; i < count && placed < budget; i += 1) {
      const lon = city.lon + (random() * 2 - 1) * spread
      const lat = city.lat + (random() * 2 - 1) * spread * 0.7
      if (!onLand(lon, lat, polys)) continue
      push(lon, lat, 0.22 + random() * 0.4 * scale)
      placed += 1
    }
  }

  // ————— links —————
  const vec = ([lon, lat]) => {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    return [
      -Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ]
  }
  const vectors = nodes.map(vec)
  const d2 = (a, b) => {
    const dx = vectors[a][0] - vectors[b][0]
    const dy = vectors[a][1] - vectors[b][1]
    const dz = vectors[a][2] - vectors[b][2]
    return dx * dx + dy * dy + dz * dz
  }

  const seen = new Set()
  const edges = []
  const add = (a, b, long) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    if (seen.has(key) || a === b) return
    seen.add(key)
    edges.push([a, b, Math.max(nodes[a][3], nodes[b][3]), long ? 1 : 0])
  }

  // Local links only between near neighbours in the same region, and only when
  // genuinely close — otherwise sparse regions grow long spurious tendrils.
  const MAX_LOCAL = 0.16
  for (let i = 0; i < nodes.length; i += 1) {
    const near = []
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j || nodes[i][3] !== nodes[j][3]) continue
      const d = d2(i, j)
      if (d < MAX_LOCAL * MAX_LOCAL) near.push([j, d])
    }
    near.sort((p, q) => p[1] - q[1])
    for (const [j] of near.slice(0, LOCAL_LINKS)) add(i, j, false)
  }

  // Intercontinental arcs from the brightest hubs; half anchored at New Haven.
  const hubs = nodes
    .map((n, i) => ({ i, w: n[2], order: n[3] }))
    .filter((h) => h.i !== 0 && h.w > 0.72)
  for (let n = 0; n < LONG_LINKS && hubs.length > 0; n += 1) {
    const a = hubs[Math.floor(random() * hubs.length)]
    if (n % 2 === 0) { add(0, a.i, true); continue }
    const b = hubs[Math.floor(random() * hubs.length)]
    if (a.order !== b.order) add(a.i, b.i, true)
  }

  const out = { nodes, edges, origin: 0 }
  writeFileSync(
    join(process.cwd(), 'lib', 'landing', 'globe-nodes.json'),
    `${JSON.stringify(out)}\n`,
  )
  const perRegion = {}
  for (const n of nodes) perRegion[n[3]] = (perRegion[n[3]] ?? 0) + 1
  console.log(`nodes ${nodes.length}  edges ${edges.length}  long ${edges.filter((e) => e[3]).length}`)
  console.log('per region order:', perRegion)
}

main().catch((e) => { console.error(e); process.exit(1) })
