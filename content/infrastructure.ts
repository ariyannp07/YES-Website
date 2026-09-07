/**
 * /infrastructure — what YES actually gives a builder, in four parts.
 *
 * Owner-written, transcribed from the "Home to Yale's builders" one-pager.
 * Nothing here is inferred or expanded (build spec §8.5).
 *
 * WHY THIS IS A PAGE AND NOT FOUR EDITS. Common Room and the SF Hacker House
 * already have pages of their own, so the obvious move was to fold this copy
 * into them. Two things stopped that: the New Haven House has no page to fold
 * into, and the four blocks are one argument — a builder gets a community, a
 * society, a summer, and a room — which stops making its case the moment it is
 * split across three routes. The overview lives here; `href` sends the two that
 * have depth to that depth rather than restating it.
 */

export interface Pillar {
  readonly slug: string
  readonly name: string
  /** The headline number, where the owners gave one. */
  readonly figure?: { readonly value: string; readonly label: string }
  readonly body: readonly string[]
  readonly image: string
  readonly alt: string
  readonly width: number
  readonly height: number
  /** Set where a fuller page exists; the heading links to it. */
  readonly href?: string
  /** Present only on photographs the society did not shoot itself. */
  readonly credit?: string
}

export const INFRASTRUCTURE_LEAD = 'Home to Yale’s builders'

export const PILLARS: readonly Pillar[] = [
  {
    slug: 'yes',
    name: 'YES',
    /* The membership tier, stated the way the other two state theirs: Common
       Room takes 15 founders a year, the Hacker House 15 Yalies, this 100. */
    figure: { value: '100', label: 'members each year' },
    body: [
      'Member of YES — the undergraduate community for Yalies exploring ambitious ideas, building companies, and doing research.',
      'Dinners, events, and introductions to founders and firms in our community.',
    ],
    image: '/infrastructure/yes.jpg',
    alt: 'Members talking in the backyard of the Hacker House.',
    width: 1400,
    height: 933,
  },
  {
    slug: 'common-room',
    name: 'Common Room',
    figure: { value: '$700M+', label: 'total company valuation' },
    body: [
      'A tap-only, lifetime society selecting 15 high-agency Yale founders each year.',
      'Private demos, peer feedback, founder and investor dinners, optional build sprints, retreats, and tech treks. Support continues after graduation.',
    ],
    image: '/infrastructure/common-room.jpg',
    alt: 'Founders gathered around a laptop at the dining table.',
    width: 1400,
    height: 933,
    href: '/common-room',
    credit: 'The Wall Street Journal',
  },
  {
    slug: 'hacker-house',
    name: 'SF Hacker House',
    /* $17M+ — matching content/work.ts and /hacker-house, which the "More"
       link on this row leads to. The one-pager said $17M; the owners confirmed
       the plus is right. */
    figure: { value: '$17M+', label: 'raised' },
    body: [
      'For the 15 most exceptional Yalies going full-time on their ideas.',
      'The expectation is everyone in this cohort raises.',
      'The hub for Yalies building in the Bay, hosting dinners with leading VCs and angel investors, plus events that bring the wider community together.',
    ],
    image: '/infrastructure/hacker-house.jpg',
    alt: 'The Hacker House on Hyde Street, a Yale flag hung from a second-floor window.',
    width: 1400,
    height: 933,
    href: '/hacker-house',
    credit: 'The Wall Street Journal',
  },
  {
    slug: 'new-haven',
    name: 'New Haven House',
    body: [
      'A year-round workspace and the academic-year hub for Yale builders.',
      'Build sessions, workshops, small dinners, internal demos, and office hours. Find collaborators and future co-founders, get peer advice, and work together.',
    ],
    image: '/infrastructure/new-haven.jpg',
    alt: 'The New Haven house, a red Victorian, under snow.',
    /* Native size. The only source is 882x588; upscaling it to match the
       others would have invented pixels for no gain — the row renders it at
       about 450px, so this still covers a retina screen. Same 3:2 as the rest. */
    width: 882,
    height: 588,
  },
] as const

/** Owner-supplied. Named backers, so it is written once and not paraphrased. */
export const HACKER_HOUSE_SUPPORT =
  'Summer 2026 Hacker House rent and programming supported by Caffeinated Capital, Long Journey Ventures, Perkins Coie, and HSBC Innovation Banking.'
