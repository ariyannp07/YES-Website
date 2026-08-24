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
  regions: { at: 1.0, stagger: 0.34, nodeFade: 0.55, jitter: 0.28 },

  /** Local constellation links trail their region slightly. */
  localEdges: { delay: 0.3, dur: 0.7 },

  /** Intercontinental arcs, once the continents themselves are legible. */
  longEdges: { at: 3.3, dur: 1.0 },

  /**
   * The two homes ignite in order — New Haven first, because it is the origin,
   * then San Francisco. Gold rather than white: white read as a system alert,
   * gold reads as a hearth, which is the word being illustrated.
   */
  marks: [
    { id: 'new-haven', label: 'New Haven · Home', lon: -72.928, lat: 41.309, at: 4.1, typeAt: 4.55 },
    // Nob Hill, San Francisco.
    { id: 'san-francisco', label: 'SF · Home', lon: -122.4161, lat: 37.793, at: 5.0, typeAt: 5.45 },
  ],

  /** Shared shape of an ignition. */
  flash: { dur: 1.5 },

  /** Marker labels type at the same rate as each other. */
  marker: { cps: 34 },

  /** Copy types out in the wake of the ignitions. */
  title: { at: 5.9, cps: 26 },
  motto: { at: 7.0, cps: 30 },
  link: { at: 8.1, dur: 0.9 },
} as const

/** Seconds until the field is fully online — used to settle into ambient. */
export const REVEAL_END = TIMING.link.at + TIMING.link.dur

export const typingDuration = (text: string, cps: number): number => text.length / cps
