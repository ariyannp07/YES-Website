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
  starsIn: { at: 0.02, dur: 0.22 },

  /** The sphere's rim and haze arrive before any node, so nodes land ON something. */
  globeIn: { at: 0.03, dur: 0.28 },

  /** Regions come online in the order set by REGIONS[].order. */
  regions: { at: 0.08, stagger: 0.045, nodeFade: 0.14, jitter: 0.04 },

  /** Local constellation links trail their region slightly. */
  localEdges: { delay: 0.05, dur: 0.16 },

  /** Intercontinental arcs, once the continents themselves are legible. */
  longEdges: { at: 0.4, dur: 0.2 },

  /**
   * The two homes ignite in order — New Haven first, because it is the origin,
   * then San Francisco. Gold rather than white: white read as a system alert,
   * gold reads as a hearth, which is the word being illustrated.
   */
  marks: [
    { id: 'new-haven', label: 'New Haven', lon: -72.928, lat: 41.309, at: 0.48, typeAt: 0.52 },
    // Nob Hill, San Francisco.
    { id: 'san-francisco', label: 'San Francisco', lon: -122.4161, lat: 37.793, at: 0.58, typeAt: 0.62 },
  ],

  /** A dotted route draws west once both homes have ignited, then keeps moving. */
  route: { at: 0.6, dur: 0.24, speed: 0.22 },

  /** Shared shape of an ignition. */
  flash: { dur: 0.36 },

  /** Marker labels type at the same rate as each other. */
  marker: { cps: 120 },

  /** Copy types out in the wake of the ignitions. */
  title: { at: 0.62, cps: 80 },
  motto: { at: 0.7, cps: 80 },
  link: { at: 0.78, dur: 0.15 },
} as const

/** Seconds until the field is fully online — used to settle into ambient. */
export const REVEAL_END = TIMING.link.at + TIMING.link.dur

export const typingDuration = (text: string, cps: number): number => text.length / cps
