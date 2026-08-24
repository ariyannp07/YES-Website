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

// 50m, not 110m. At 110m the coastlines are so generalised that Italy, the UK
// and Indonesia stop being recognisable, which is precisely what went wrong the
// first time. 50m costs ~1.6MB at GENERATION time only — nothing ships.
const LAND =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson'
const PLACES =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places_simple.geojson'

/**
 * Silhouette dots. Fewer than before: with the coastline drawn as line work,
 * the interior fill no longer has to carry the shape, and a lighter fill is
 * what stops Eurasia reading as one undifferentiated mass.
 */
const LAND_DOTS = 2500

/** Coastline resampling step, in degrees of arc. Smaller = more faithful. */
const COAST_STEP = 1.15
/** Rings shorter than this (degrees of perimeter) are dropped as specks. */
const COAST_MIN_PERIMETER = 7
/** City-light dots, clustered on real metros — the bright layer. */
const CITY_DOTS = 2100

/**
 * Links are drawn between CITY anchors only, never between silhouette dots.
 * Linking everything produced a mesh that buried the landmasses; the network is
 * supposed to read as a layer over Earth, not as Earth's texture.
 */
const LINK_HUBS = 190
const LOCAL_LINKS = 2
const LONG_LINKS = 30

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

/**
 * Polygons, each with a precomputed bounding box.
 *
 * 50m land is ~1420 polygons and sampling makes hundreds of thousands of
 * queries; testing every ring every time takes minutes. A bbox reject first
 * turns it into seconds.
 */
const polygons = (geo) => {
  const out = []
  for (const feature of geo.features) {
    const g = feature.geometry
    if (!g) continue
    const parts = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    for (const poly of parts) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const [x, y] of poly[0]) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
      out.push({ rings: poly, minX, minY, maxX, maxY })
    }
  }
  return out
}

/** A polygon is [outerRing, ...holes]; a point counts only if outside holes. */
const onLand = (lon, lat, polys) => {
  for (const poly of polys) {
    if (lon < poly.minX || lon > poly.maxX || lat < poly.minY || lat > poly.maxY) continue
    const rings = poly.rings
    if (!pointInRing(lon, lat, rings[0])) continue
    let inHole = false
    for (let h = 1; h < rings.length; h += 1) {
      if (pointInRing(lon, lat, rings[h])) { inHole = true; break }
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
  const hubIndices = []
  const push = (lon, lat, weight, hub = false) => {
    const order = regionOf(lon, lat).order
    const index = nodes.length
    nodes.push([
      Number(lon.toFixed(3)),
      Number(lat.toFixed(3)),
      Number(weight.toFixed(3)),
      order,
    ])
    if (hub) hubIndices.push(index)
    return index
  }

  // New Haven is index 0, always — the reveal is built around it existing.
  push(-72.93, 41.31, 1, true)

  // Pass 1 — the silhouette. asin() keeps density even on the sphere rather
  // than crowding the poles the way uniform latitude would.
  let guard = 0
  while (nodes.length < LAND_DOTS && guard < 400_000) {
    guard += 1
    const lon = random() * 360 - 180
    const lat = (Math.asin(random() * 2 - 1) * 180) / Math.PI
    if (lat > 83 || lat < -60) continue // Antarctica reads as a rendering bug
    if (!onLand(lon, lat, polys)) continue
    // Faint: these carry the shape of the land, nothing more.
    push(lon, lat, 0.09 + random() * 0.13)
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
  let placed = 0
  for (const [rank, city] of cities.entries()) {
    if (placed >= CITY_DOTS) break
    const scale = Math.log10(city.pop) / Math.log10(maxPop) // 0..1, compressed
    const count = Math.max(1, Math.round(scale * scale * 7))
    // The metro itself: one bright anchor. Only the top places become hubs, so
    // the link layer stays a sparse network rather than a cobweb.
    push(city.lon, city.lat, 0.5 + scale * 0.5, rank < LINK_HUBS)
    placed += 1
    // Its sprawl: a tight halo, tighter for smaller places.
    const spread = 0.55 + scale * 2.1
    for (let i = 1; i < count && placed < CITY_DOTS; i += 1) {
      const lon = city.lon + (random() * 2 - 1) * spread
      const lat = city.lat + (random() * 2 - 1) * spread * 0.7
      if (!onLand(lon, lat, polys)) continue
      push(lon, lat, 0.2 + random() * 0.36 * scale)
      placed += 1
    }
  }

  // ————— coastlines —————
  //
  // The single biggest legibility win. A field of dots gives a landmass its
  // extent but not its EDGE, so Asia, Europe and Africa merged into one blob;
  // stroking the coast is what separates India, the Mediterranean, the Black
  // and Caspian seas, Japan, Korea and island south-east Asia.
  //
  // Rings are resampled at a fixed arc step rather than drawn vertex-for-vertex
  // so the line density is even everywhere, instead of following how finely
  // Natural Earth happened to digitise a given stretch of coast.
  const coast = []
  for (const poly of polys) {
    for (const ring of poly.rings) {
      let perimeter = 0
      for (let i = 1; i < ring.length; i += 1) {
        perimeter += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1])
      }
      if (perimeter < COAST_MIN_PERIMETER) continue

      const pts = []
      let carry = 0
      for (let i = 1; i < ring.length; i += 1) {
        const [ax, ay] = ring[i - 1]
        const [bx, by] = ring[i]
        // Longitude seam: a segment that appears to span the globe is really
        // the ring wrapping at the antimeridian. Drawing it would put a line
        // straight through the planet.
        if (Math.abs(bx - ax) > 180) { carry = 0; continue }
        const seg = Math.hypot(bx - ax, by - ay)
        if (seg < 1e-9) continue
        let t = carry
        while (t < seg) {
          const f = t / seg
          pts.push([ax + (bx - ax) * f, ay + (by - ay) * f])
          t += COAST_STEP
        }
        carry = t - seg
      }

      for (let i = 1; i < pts.length; i += 1) {
        const [lon1, lat1] = pts[i - 1]
        const [lon2, lat2] = pts[i]
        if (Math.abs(lon2 - lon1) > 20) continue
        coast.push([
          Number(lon1.toFixed(2)), Number(lat1.toFixed(2)),
          Number(lon2.toFixed(2)), Number(lat2.toFixed(2)),
          regionOf((lon1 + lon2) / 2, (lat1 + lat2) / 2).order,
        ])
      }
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

  // Local links between nearby HUB cities in the same region. Restricting to
  // hubs is what keeps the land readable: linking every dot produced a mesh
  // dense enough to hide the continents underneath it.
  const MAX_LOCAL = 0.34
  for (const i of hubIndices) {
    const near = []
    for (const j of hubIndices) {
      if (i === j || nodes[i][3] !== nodes[j][3]) continue
      const d = d2(i, j)
      if (d < MAX_LOCAL * MAX_LOCAL) near.push([j, d])
    }
    near.sort((p, q) => p[1] - q[1])
    for (const [j] of near.slice(0, LOCAL_LINKS)) add(i, j, false)
  }

  // Intercontinental arcs; half anchored at New Haven so the origin already
  // reads as a hub before the flash asserts it.
  const hubs = hubIndices.filter((i) => i !== 0)
  for (let n = 0; n < LONG_LINKS && hubs.length > 0; n += 1) {
    const a = hubs[Math.floor(random() * hubs.length)]
    if (n % 2 === 0) { add(0, a, true); continue }
    const b = hubs[Math.floor(random() * hubs.length)]
    if (nodes[a][3] !== nodes[b][3]) add(a, b, true)
  }

  const out = { nodes, edges, coast, origin: 0 }
  writeFileSync(
    join(process.cwd(), 'lib', 'landing', 'globe-nodes.json'),
    `${JSON.stringify(out)}\n`,
  )
  const perRegion = {}
  for (const n of nodes) perRegion[n[3]] = (perRegion[n[3]] ?? 0) + 1
  console.log(
    `nodes ${nodes.length}  edges ${edges.length}  long ${edges.filter((e) => e[3]).length}  coast ${coast.length}`,
  )
  console.log('per region order:', perRegion)
}

main().catch((e) => { console.error(e); process.exit(1) })
