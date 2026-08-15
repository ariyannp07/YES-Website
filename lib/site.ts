/**
 * Site-wide constants. Nothing here is invented — the name, the founding year
 * and the initiative list all trace to canon/01-vision-brief.md or to the
 * current yesyale.org, per build spec §8.5.
 */

export const SITE_NAME = 'Yale Entrepreneurial Society'

/** Carried over from the current site — oldest-club legitimacy in three words. */
export const FOUNDED_LINE = 'Building since 1999'


export const CONTACT = {
  ariyan: 'ariyan.patel@yale.edu',
  sofia: 'sst39@yale.edu',
} as const

/**
 * The interior nav. Build spec §2 includes the alumni page; §4's restatement
 * omits it. §2 governs — it is the show-don't-tell centerpiece, so it is
 * reachable. Named "Catalog" at the owners' direction rather than "Alumni".
 *
 * `hidden` pages stay routable but unlinked. /builders dark-ships until the
 * consented catalog clears BUILDERS_MIN_ENTRIES (build spec §3).
 */
export interface NavItem {
  readonly href: string
  readonly label: string
  readonly hidden?: boolean
}

export const NAV: readonly NavItem[] = [
  { href: '/manifesto', label: 'Manifesto' },
  { href: '/work', label: 'Work' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/builders', label: 'Builders', hidden: true },
  { href: '/reservoir', label: 'Reservoir' },
  { href: '/enter', label: 'Enter' },
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
