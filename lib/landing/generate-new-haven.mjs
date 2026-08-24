/**
 * Builds the New Haven city plate from OpenStreetMap.
 *
 *   node lib/landing/generate-new-haven.mjs
 *
 * Writes lib/landing/new-haven.json — real streets, parks and water around
 * 52 Trumbull St, projected to metres on a local plane and thinned hard.
 * Committed, so the page never calls Overpass.
 *
 * Real geometry rather than a stylised impression: the nine-square grid, the
 * Green, the angle of Whitney Avenue and the sweep of I-91 are recognisable to
 * anyone who has lived there, and inventing them would be obvious to exactly
 * the people this is for.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 52 Trumbull St, New Haven CT — the origin of the local plane. */
const HOME = { lat: 41.3105, lon: -72.9265 }

const BOX = { s: 41.2955, w: -72.949, n: 41.3265, e: -72.904 }

const CLASSES = {
  motorway: 0, trunk: 0, motorway_link: 0, trunk_link: 0,
  primary: 1, primary_link: 1,
  secondary: 2,
  tertiary: 3,
  residential: 4, unclassified: 4,
}

/** Metres per degree at this latitude. */
const M_LAT = 111_320
const M_LON = 111_320 * Math.cos((HOME.lat * Math.PI) / 180)

const toLocal = (lat, lon) => [
  Math.round((lon - HOME.lon) * M_LON),
  // Screen y grows downward; north should be up.
  Math.round(-(lat - HOME.lat) * M_LAT),
]

/** Drop points that barely deviate from the line between their neighbours. */
const thin = (pts, tolerance) => {
  if (pts.length < 3) return pts
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [ax, ay] = out[out.length - 1]
    const [bx, by] = pts[i]
    const [cx, cy] = pts[i + 1]
    const cross = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))
    const span = Math.hypot(cx - ax, cy - ay) || 1
    if (cross / span > tolerance || Math.hypot(bx - ax, by - ay) > 90) out.push(pts[i])
  }
  out.push(pts[pts.length - 1])
  return out
}

const query = `[out:json][timeout:90];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|motorway_link|trunk_link|primary_link)$"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});
  way["natural"="water"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});
  way["leisure"="park"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});
);
out geom;`

const main = async () => {
  // Overpass is a shared free service: it answers 406 to a body with no
  // content-type, and 504 whenever it is busy. Pass a previously-saved response
  // as argv[2] to rebuild without hitting it at all.
  const local = process.argv[2]
  let payload
  if (local) {
    payload = JSON.parse(readFileSync(local, 'utf8'))
  } else {
    for (let attempt = 1; attempt <= 4 && !payload; attempt += 1) {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'yes-website-landing/1.0 (one-off build script)',
          Accept: 'application/json',
        },
        body: query,
      })
      if (res.ok) payload = await res.json()
      else if (attempt === 4) throw new Error(`overpass ${res.status}`)
      else await new Promise((r) => setTimeout(r, attempt * 4000))
    }
  }
  const { elements = [] } = payload

  const roads = []
  const parks = []
  const water = []

  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue
    const pts = thin(el.geometry.map((g) => toLocal(g.lat, g.lon)), 6)
    const tags = el.tags ?? {}

    if (tags.leisure === 'park') {
      // Small courtyards add noise at this zoom; keep the real green spaces.
      if (pts.length >= 4) parks.push(pts.flat())
      continue
    }
    if (tags.natural === 'water') {
      if (pts.length >= 4) water.push(pts.flat())
      continue
    }
    const rank = CLASSES[tags.highway]
    if (rank === undefined) continue
    roads.push([rank, ...pts.flat()])
  }

  const out = { home: [0, 0], roads, parks, water }
  writeFileSync(join(process.cwd(), 'lib', 'landing', 'new-haven.json'), `${JSON.stringify(out)}\n`)

  const counts = roads.reduce((acc, r) => ((acc[r[0]] = (acc[r[0]] ?? 0) + 1), acc), {})
  console.log(`roads ${roads.length} by class ${JSON.stringify(counts)}  parks ${parks.length}  water ${water.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
