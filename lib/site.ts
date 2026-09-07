/**
 * Site-wide constants. Nothing here is invented — the name, the founding year
 * and the initiative list all trace to canon/01-vision-brief.md or to the
 * current yesyale.org, per build spec §8.5.
 */

export const SITE_NAME = 'Yale Entrepreneurial Society'

/**
 * The footer line. Keeps the founding year from the current site (oldest-club
 * legitimacy) and hangs the brief's closing argument on it — canon/01 ends
 * "must learn not only to study that future—but to build it", which is the
 * §3.4 "not X but Y" reframe this line runs.
 */
export const FOUNDED_LINE =
  'Teaching Yalies to build the future, not just study for it. Since 1999.'


/**
 * The line under the name on the front door.
 *
 * canon/01-vision-brief.md closes on "must learn not only to study that
 * future—but to build it"; this is that argument compressed to its reframe
 * (canon 03 §3.4, "not X but Y"). Owner-written.
 *
 * "don't just study for it" rather than "not study for it": the earlier
 * wording read as an argument against studying, which is not the claim. The
 * point is that studying is insufficient, not that it is wrong.
 */
export const LANDING_LINE = 'Build the future, don’t just study for it.'

/**
 * The landing's only prose, owner-written.
 *
 * Set small and unbold at --text-body, on a page that is otherwise a row of
 * marks and one press clipping. The size is the point: the claim is large and
 * the setting refuses to raise its voice for it.
 *
 * Held as an array because the statement has been one sentence and two, and the
 * renderer sets it a line at a time either way.
 */
export const YES_MESSAGE = [
  'The community producing the next generation of Yale excellence.',
] as const

export const CONTACT = {
  ariyan: 'ariyan.patel@yale.edu',
  sofia: 'sst39@yale.edu',
} as const

/** The public structure. Hidden routes remain reachable but are not promoted. */
export interface NavItem {
  readonly href: string
  readonly label: string
  readonly hidden?: boolean
}

/**
 * The header carries everything the landing no longer does.
 *
 * The landing was cut to four beats — mark, statement, the WSJ story, the VC
 * community — so the sections it used to hold (the stats, the Thesis/People
 * cards, the Common Room teaser, the press list) now live behind these links
 * and nowhere else. That makes the header load-bearing: a promoted item with
 * no route is a dead end, not a soft landing, which is what `site.test.ts`
 * checks. Press in particular pointed at `/#press` — an anchor into a section
 * that no longer exists.
 */
export const NAV: readonly NavItem[] = [
  { href: '/common-room', label: 'Common Room' },
  { href: '/hacker-house', label: 'Hacker House' },
  { href: '/reservoir', label: 'Press' },
  { href: '/thesis', label: 'Thesis' },
  // Unlinked legacy and consent-gated surfaces. People is hidden at owner
  // direction — the catalog still builds and /catalog still resolves for anyone
  // holding the link; it is simply not promoted.
  { href: '/catalog', label: 'People', hidden: true },
  { href: '/work', label: 'Work', hidden: true },
  { href: '/enter', label: 'Join YES', hidden: true },
  { href: '/builders', label: 'Builders', hidden: true },
] as const

/** Below this many consented entries, /builders stays unlinked (build spec §3). */
export const BUILDERS_MIN_ENTRIES = 15

/** Minimal fallback links consumed by archived landing prototypes. */
export const LANDING_LINKS: readonly NavItem[] = [
  { href: '/thesis', label: 'Thesis' },
] as const
