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

/**
 * Places the asterism up and to the left, in front of the camera.
 *
 * The whole constellation is rotated as ONE rigid body, so its internal
 * geometry — and the pointer-stars line to Polaris — survives the move. Placing
 * the stars individually would have produced a shape that merely resembled the
 * Plough.
 */
export const buildAsterism = (radius = SHELL * 0.72): Asterism => {
  const yaw = -2.16
  const pitch = 0.30

  const place = ([name, ra, dec, mag]: readonly [string, number, number, number]) => {
    let v = fromRaDec(ra, dec)
    v = rotate(v, [0, 1, 0], yaw)
    v = rotate(v, [1, 0, 0], pitch)
    return { name, x: v[0] * radius, y: v[1] * radius, z: v[2] * radius, mag }
  }

  return {
    stars: DIPPER.map(place),
    // Bowl: Dubhe-Merak-Phecda-Megrez-Dubhe. Handle: Megrez-Alioth-Mizar-Alkaid.
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    polaris: place(POLARIS),
  }
}

/**
 * The general field. Denser and more varied than a flat scatter: most stars are
 * faint, a few are bright, and colour drifts slightly warm — a uniform field of
 * identical white dots reads as noise, which is what the first pass looked like.
 */
export const buildStars = (count = 2600): readonly Star[] => {
  const random = createRandom(0x5359304b)
  const stars: Star[] = []

  for (let i = 0; i < count; i += 1) {
    // Rejection-sample a direction so the field is even on the sphere.
    let x = 0
    let y = 0
    let z = 0
    let len = 0
    do {
      x = random() * 2 - 1
      y = random() * 2 - 1
      z = random() * 2 - 1
      len = Math.sqrt(x * x + y * y + z * z)
    } while (len < 0.001 || len > 1)

    const r = SHELL * (0.85 + random() * 0.3)
    // Magnitude-like distribution: many faint, few bright.
    const roll = random()
    const bright = Math.pow(roll, 3.1)

    stars.push({
      x: (x / len) * r,
      y: (y / len) * r,
      z: (z / len) * r,
      size: 0.045 + bright * 0.16,
      alpha: 0.18 + bright * 0.82,
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
export const buildClouds = (count = 9): readonly Cloud[] => {
  const random = createRandom(0x43104d21)
  const clouds: Cloud[] = []

  for (let i = 0; i < count; i += 1) {
    let x = 0
    let y = 0
    let z = 0
    let len = 0
    do {
      x = random() * 2 - 1
      y = random() * 2 - 1
      z = random() * 2 - 1
      len = Math.sqrt(x * x + y * y + z * z)
    } while (len < 0.001 || len > 1)

    const r = SHELL * (1.05 + random() * 0.25)
    clouds.push({
      x: (x / len) * r,
      y: (y / len) * r,
      z: (z / len) * r,
      size: 9 + random() * 13,
      alpha: 0.05 + random() * 0.05,
      hue: random(),
    })
  }
  return clouds
}
