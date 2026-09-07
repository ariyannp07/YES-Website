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
 * The photographs are the owners' own. The Wall Street Journal's photographs of
 * the house are NOT included: the site renders no third-party image without a
 * recorded grant, the same rule content/marks/approved.json enforces for logos.
 * Swap them in by dropping the files in public/hacker-house and adding rows
 * below WITH a credit — never by replacing these silently.
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
 * All three are cropped to 3:4 from landscape originals, so they are tighter
 * than the frames they came from — the cohort shot loses people at both edges.
 * Captions are deliberately absent: three images in a row read as one picture,
 * and a caption under each breaks it back into three.
 */
export const HOUSE_PHOTOS: readonly HousePhoto[] = [
  {
    src: '/hacker-house/cohort.jpg',
    alt: 'The Hacker House cohort gathered around a table in the backyard.',
    caption: 'The house, in the backyard on Hyde Street.',
    width: 900,
    height: 1200,
  },
  {
    src: '/hacker-house/night-session.jpg',
    alt: 'Four people working on laptops around a table at night.',
    caption: 'Most evenings looked like this.',
    width: 900,
    height: 1200,
  },
  {
    src: '/hacker-house/hallway.jpg',
    alt: 'Three people talking in the hallway of the house.',
    caption: 'The hallway did more work than any conference room.',
    width: 900,
    height: 1200,
  },
] as const

/** The printed paper, photographed. Sits apart from the house photographs. */
export const HOUSE_CLIPPING: HousePhoto = {
  src: '/hacker-house/wsj-print.jpg',
  alt: 'The Wall Street Journal Personal Journal page carrying the Hacker House story.',
  caption: 'The Wall Street Journal, Personal Journal, 14 July 2026.',
  width: 735,
  height: 1400,
}

export const HOUSE_APPROVED = false
export const HOUSE_DRAFT_LABEL = 'DRAFT — AWAITING OWNER APPROVAL'
