/**
 * /hacker-house — the first Yale Hacker House, San Francisco, summer 2026.
 *
 * WHERE THESE FACTS COME FROM. The figures are the ones already carried by
 * content/work.ts, which sources them to canon/01-vision-brief.md → "PROOF OF
 * POTENTIAL". Nothing here is new reporting, and nothing is invented
 * (build spec §8.5). work.ts flags its own context lines as agent-written and
 * ships as a draft; the same caveat applies here, which is why HOUSE_APPROVED
 * is false.
 *
 * The photographs are The Wall Street Journal's, used with the owners'
 * confirmation that they hold the rights, and every one carries a credit. The
 * originals live in the owners' Drive as IMG_9009, IMG_1148 and IMG_9890.
 */

export interface HouseFigure {
  readonly figure: string
  readonly context: string
}

/** Verbatim from content/work.ts, which traces them to the vision brief. */
export const HOUSE_FIGURES: readonly HouseFigure[] = [
  {
    figure: '14',
    context: 'teams brought together in San Francisco for the first Yale Hacker House.',
  },
  {
    figure: '$17M+',
    context:
      'raised by five of those teams already — across biotechnology, robotics, spacetech, assistive technology, financial infrastructure, and AI-native legal systems.',
  },
] as const

export interface HousePhoto {
  readonly src: string
  readonly alt: string
  readonly caption: string
  readonly width: number
  readonly height: number
  /** Present only for images the society did not shoot itself. */
  readonly credit?: string
}

/**
 * Exactly three, set side by side as verticals with the figures beneath.
 *
 * These are The Wall Street Journal's photographs of the house, used with the
 * owners' confirmation that they hold the rights. `credit` is not decoration:
 * the site renders no third-party image without an attribution line, the same
 * rule content/marks/approved.json enforces for logos.
 *
 * All three are 3:2 frames cropped to 3:4, so half the width is gone and the
 * crop had to be chosen rather than centred — the house sits left of centre
 * between its neighbours, and the hallway frame is pulled left to hold both the
 * man in the doorway and the whiteboard. Captions are absent: three images in a
 * row read as one picture, and a caption apiece breaks it back into three.
 */
export const HOUSE_PHOTOS: readonly HousePhoto[] = [
  {
    src: '/hacker-house/house.jpg',
    alt: 'The Hacker House on Hyde Street, a Yale flag hung from a second-floor window.',
    caption: 'The house on Hyde Street.',
    width: 900,
    height: 1200,
    credit: 'The Wall Street Journal',
  },
  {
    src: '/hacker-house/table.jpg',
    alt: 'Founders gathered around a laptop at the dining table.',
    caption: 'The dining table, which was also the desk.',
    width: 900,
    height: 1200,
    credit: 'The Wall Street Journal',
  },
  {
    src: '/hacker-house/hallway.jpg',
    alt: 'A whiteboard of architecture notes propped in the hallway beside someone working.',
    caption: 'The hallway did more work than any conference room.',
    width: 900,
    height: 1200,
    credit: 'The Wall Street Journal',
  },
] as const

/**
 * Owner-approved 2026-09-06, covering the figures and the photographs.
 *
 * Build spec §8.4 requires explicit owner sign-off before copy is deployed;
 * this flag IS that sign-off, which is why it lives in the content file as a
 * reviewable diff rather than in a deploy setting. Note the figures still come
 * from content/work.ts, which carries its own WORK_APPROVED = false for the
 * /work page — approving them here does not approve that page.
 */
export const HOUSE_APPROVED = true
export const HOUSE_DRAFT_LABEL = 'DRAFT — AWAITING OWNER APPROVAL'
