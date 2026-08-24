/**
 * The reveal, as one timeline in seconds from first paint.
 *
 * EVERY tunable for the sequence lives here — the canvas and the typed copy
 * both read it, so the flash and the title can never drift apart. Adjusting the
 * pacing should mean editing this file and nothing else.
 *
 * The whole primary reveal lands at ~7s: long enough to feel deliberate, short
 * enough that a second visit is not a wait.
 */
export const TIMING = {
  /** Stars fade up out of black. */
  starsIn: { at: 0.15, dur: 1.1 },

  /** The sphere's rim and haze arrive before any node, so nodes land ON something. */
  globeIn: { at: 0.5, dur: 1.6 },

  /** Regions come online in the order set by REGIONS[].order. */
  regions: { at: 1.2, stagger: 0.42, nodeFade: 0.55, jitter: 0.28 },

  /** Local constellation links trail their region slightly. */
  localEdges: { delay: 0.3, dur: 0.7 },

  /** Intercontinental arcs, once the continents themselves are legible. */
  longEdges: { at: 3.7, dur: 1.0 },

  /** New Haven ignites. One point of white, with an origin — see globe-canvas. */
  flash: { at: 4.6, dur: 1.3 },

  /** Copy types out in the wake of the flash. */
  title: { at: 5.1, cps: 26 },
  motto: { at: 6.2, cps: 30 },
  link: { at: 7.4, dur: 0.9 },
} as const

/** Seconds until the field is fully online — used to settle into ambient. */
export const REVEAL_END = TIMING.link.at + TIMING.link.dur

export const typingDuration = (text: string, cps: number): number => text.length / cps
