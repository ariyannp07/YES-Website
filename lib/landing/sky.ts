/**
 * The sky behind the globe: stars, faint gas, and one easter egg.
 *
 * Everything here is deterministic — the star field is a design decision, not a
 * different picture on every reload.
 */

import { createRandom } from '@/lib/seeded-random'

export interface Star {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly size: number
  readonly alpha: number
  /** 0 = cool white, 1 = warm — real fields are not monochrome. */
  readonly warmth: number
}

export interface Cloud {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly size: number
  readonly alpha: number
  readonly hue: number
}

const SHELL = 26

/**
 * A random direction inside a cone around -Z, which is where the camera looks.
 *
 * `spread` is the sine of the cone's half-angle. Sampling z uniformly over the
 * cap keeps the density even rather than crowding the axis.
 */
const coneDirection = (
  random: () => number,
  spread: number,
): [number, number, number] => {
  const cosMax = Math.sqrt(Math.max(0, 1 - spread * spread))
  const cosA = 1 - random() * (1 - cosMax)
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA))
  const phi = random() * Math.PI * 2
  // Cone axis is -Z.
  return [sinA * Math.cos(phi), sinA * Math.sin(phi), -cosA]
}

/**
 * Right ascension (hours) and declination (degrees) to a unit vector, in the
 * same Y-up frame the globe uses.
 */
const fromRaDec = (raHours: number, dec: number): [number, number, number] => {
  const ra = (raHours / 24) * Math.PI * 2
  const d = (dec * Math.PI) / 180
  return [Math.cos(d) * Math.cos(ra), Math.sin(d), Math.cos(d) * Math.sin(ra)]
}

/**
 * The Plough, and Polaris.
 *
 * Real coordinates, so the asterism has its true shape and — more importantly —
 * Dubhe and Merak really do point at Polaris. Anyone who knows the sky can
 * check it, which is the whole point of hiding it here.
 */
const DIPPER: readonly (readonly [string, number, number, number])[] = [
  // name, RA hours, Dec degrees, apparent magnitude
  ['Dubhe', 11.062, 61.751, 1.79],
  ['Merak', 11.031, 56.382, 2.37],
  ['Phecda', 11.897, 53.695, 2.44],
  ['Megrez', 12.257, 57.033, 3.31],
  ['Alioth', 12.9, 55.96, 1.77],
  ['Mizar', 13.399, 54.925, 2.23],
  ['Alkaid', 13.792, 49.313, 1.86],
]

const POLARIS: readonly [string, number, number, number] = ['Polaris', 2.53, 89.264, 1.98]

/** Rodrigues rotation — used to swing the asterism into view unchanged. */
const rotate = (
  v: readonly [number, number, number],
  axis: readonly [number, number, number],
  angle: number,
): [number, number, number] => {
  const [x, y, z] = v
  const [ax, ay, az] = axis
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dot = x * ax + y * ay + z * az
  return [
    x * c + (ay * z - az * y) * s + ax * dot * (1 - c),
    y * c + (az * x - ax * z) * s + ay * dot * (1 - c),
    z * c + (ax * y - ay * x) * s + az * dot * (1 - c),
  ]
}

export interface Asterism {
  readonly stars: readonly { name: string; x: number; y: number; z: number; mag: number }[]
  /** Index pairs forming the Plough's outline. */
  readonly lines: readonly (readonly [number, number])[]
  readonly polaris: { name: string; x: number; y: number; z: number; mag: number }
}

const norm = (v: readonly [number, number, number]): [number, number, number] => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

const cross = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/**
 * Where the asterism sits, as a direction from the camera.
 *
 * The camera looks down -Z and never moves, so this is a fixed direction rather
 * than a screen coordinate — it stays put whichever way the globe is turned.
 *
 * Placed in the upper-left field, OUTSIDE the globe's disc. The globe subtends
 * roughly 320px of a 400px half-height, so anything near the centre would be
 * drawn on top of the planet and read as part of the network rather than as
 * sky. This is also why the spread is compressed further than it needs to be
 * for size alone — the whole figure, Polaris included, has to clear the limb.
 */
const EGG_TARGET = norm([-0.348, 0.16, -1])

/**
 * How much of the real angular spread to keep. The Plough spans about 25° of
 * sky; at this field of view that would fill the frame and stop reading as a
 * detail. Compressed, it keeps its proportions — including the pointer-stars
 * relationship to Polaris — at a size that rewards noticing rather than
 * demanding it.
 */
const EGG_SPREAD = 0.34

/**
 * Places the asterism in front of the camera, as one rigid body.
 *
 * Two steps, both structural. First each star is pulled toward the group's
 * centroid along a great circle, which shrinks the figure without distorting
 * it. Then the whole thing is swung onto EGG_TARGET by a single rotation. An
 * earlier version guessed a yaw and pitch by hand and put the entire
 * constellation off-screen with Polaris behind the camera — placement has to be
 * derived, not eyeballed.
 */
export const buildAsterism = (radius = SHELL * 0.7): Asterism => {
  const raw = [...DIPPER, POLARIS].map((entry) => ({
    name: entry[0],
    dir: fromRaDec(entry[1], entry[2]),
    mag: entry[3],
  }))

  // Centroid of the Plough alone, so Polaris keeps its true offset from it.
  const sum = raw.slice(0, DIPPER.length).reduce<[number, number, number]>(
    (acc, s) => [acc[0] + s.dir[0], acc[1] + s.dir[1], acc[2] + s.dir[2]],
    [0, 0, 0],
  )
  const centre = norm(sum)

  // Rotation carrying the centroid onto the target direction.
  const axis = norm(cross(centre, EGG_TARGET))
  const angle = Math.acos(Math.max(-1, Math.min(1, centre[0] * EGG_TARGET[0] + centre[1] * EGG_TARGET[1] + centre[2] * EGG_TARGET[2])))

  const place = (star: { name: string; dir: [number, number, number]; mag: number }) => {
    // Shrink along the great circle from the centroid.
    const d = Math.max(-1, Math.min(1, centre[0] * star.dir[0] + centre[1] * star.dir[1] + centre[2] * star.dir[2]))
    const sep = Math.acos(d)
    let v = star.dir
    if (sep > 1e-6) {
      const spin = norm(cross(centre, star.dir))
      v = rotate(centre, spin, sep * EGG_SPREAD)
    }
    v = rotate(v, axis, angle)
    return { name: star.name, x: v[0] * radius, y: v[1] * radius, z: v[2] * radius, mag: star.mag }
  }

  const placed = raw.map(place)

  return {
    stars: placed.slice(0, DIPPER.length),
    // Bowl: Dubhe-Merak-Phecda-Megrez-Dubhe. Handle: Megrez-Alioth-Mizar-Alkaid.
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    polaris: placed[placed.length - 1],
  }
}

/**
 * The general field. Denser and more varied than a flat scatter: most stars are
 * faint, a few are bright, and colour drifts slightly warm — a uniform field of
 * identical white dots reads as noise, which is what the first pass looked like.
 */
export const buildStars = (count = 3400): readonly Star[] => {
  const random = createRandom(0x5359304b)
  const stars: Star[] = []

  for (let i = 0; i < count; i += 1) {
    // Sampled into the cone the camera can actually see, not over the whole
    // sphere. The camera never moves, so a full-sphere field spent 96% of its
    // stars behind the viewer — 2600 stars put barely a hundred on screen,
    // which is why the background looked bare.
    const [x, y, z] = coneDirection(random, 0.75)

    const r = SHELL * (0.85 + random() * 0.3)
    // Magnitude-like distribution: many faint, few bright.
    const roll = random()
    const bright = Math.pow(roll, 3.1)

    stars.push({
      x: x * r,
      y: y * r,
      z: z * r,
      // These are multiplied by (110 / distance) in the shader, and the shell
      // sits at ~26 units — so the old 0.038..0.21 resolved to point sizes of
      // 0.16 to 0.9 DEVICE PIXELS. Most of the field was smaller than a pixel
      // and never drew at all, which is why adding stars changed nothing.
      size: 0.34 + bright * 0.78,
      // Most are barely there. Density carries the sky; brightness would make
      // it a light show, which is the opposite of the reference.
      alpha: 0.1 + bright * 0.9,
      warmth: random(),
    })
  }
  return stars
}

/**
 * Gas. A handful of very large, very faint sprites — enough to break the
 * flatness of pure black, not enough to notice as objects. Kept off the centre
 * so nothing competes with the globe.
 */
export const buildClouds = (count = 16): readonly Cloud[] => {
  const random = createRandom(0x43104d21)
  const clouds: Cloud[] = []

  for (let i = 0; i < count; i += 1) {
    // Same reasoning as the stars, more acutely: spread over a whole sphere,
    // nine clouds put less than one of them on screen.
    const [x, y, z] = coneDirection(random, 0.62)
    const r = SHELL * (1.05 + random() * 0.25)
    clouds.push({
      x: x * r,
      y: y * r,
      z: z * r,
      size: 11 + random() * 15,
      alpha: 0.07 + random() * 0.06,
      hue: random(),
    })
  }
  return clouds
}
