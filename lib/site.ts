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
 */
export const LANDING_LINE = 'Build the future, not study for it.'

export const CONTACT = {
  ariyan: 'ariyan.patel@yale.edu',
  sofia: 'sst39@yale.edu',
} as const

/**
 * The interior nav. Build spec §2 includes the alumni page; §4's restatement
 * omits it. §2 governs — it is the show-don't-tell centerpiece, so it is
 * reachable. Named "Catalog" at the owners' direction rather than "Alumni".
 *
 * `hidden` pages stay routable but unlinked — the pattern /builders already
 * used while dark-shipping (build spec §3). Removing a tab is not the same as
 * deleting a page: every hidden route below is still reachable by link and
 * still resolves for anyone holding its URL.
 */
export interface NavItem {
  readonly href: string
  readonly label: string
  readonly hidden?: boolean
}

export const NAV: readonly NavItem[] = [
  { href: '/manifesto', label: 'Manifesto' },
  { href: '/spectre', label: 'Spectre' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/reservoir', label: 'Reservoir' },
  // Unlinked, but live. See the note above `hidden` — /work is reached from the
  // end of the manifesto and /enter from the end of /work, which makes the
  // funnel a deliberate path rather than a tab. /enter is also the Bazaar QR's
  // destination (?src=bazaar), so it must keep resolving whatever the nav says.
  { href: '/work', label: 'Work', hidden: true },
  { href: '/enter', label: 'Enter', hidden: true },
  { href: '/builders', label: 'Builders', hidden: true },
] as const

/** Below this many consented entries, /builders stays unlinked (build spec §3). */
export const BUILDERS_MIN_ENTRIES = 15

/**
 * Landing links. Build spec §3 default: `Manifesto` alone. Adding `Enter` here
 * is the owners' call and needs no other change.
 */
export const LANDING_LINKS: readonly NavItem[] = [
  { href: '/manifesto', label: 'Manifesto' },
] as const
