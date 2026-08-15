/**
 * Deterministic PRNG (mulberry32).
 *
 * The floating field's positions MUST be identical on the server and in the
 * browser. `Math.random()` would produce a different scatter in each and React
 * would flag a hydration mismatch — so the field is laid out from a fixed seed.
 * Changing SEED reshuffles the whole field; that is the only knob.
 */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform float in [min, max). */
export const between = (random: () => number, min: number, max: number): number =>
  min + random() * (max - min)

/** Uniform float in [min, max), rounded to `places`. Keeps inline styles short. */
export const betweenRounded = (
  random: () => number,
  min: number,
  max: number,
  places = 2,
): number => Number(between(random, min, max).toFixed(places))
