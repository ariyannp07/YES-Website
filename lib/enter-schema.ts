import { z } from 'zod'

/**
 * The single intake form (build spec §3, /enter).
 *
 * One schema, imported by both the browser form and the server route, so the
 * client cannot accept something the server will reject and the server never
 * trusts the client's word for it. Validation happens at the boundary, twice.
 */

export const ROLES = ['builder', 'backer', 'helper'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  builder: 'Builder',
  backer: 'Backer',
  helper: 'Helper',
}

/** Maps to the AINS `SOURCES` enum in Boola's airtable/schema.ts. */
export const SOURCES = ['web', 'bazaar'] as const
export type Source = (typeof SOURCES)[number]

export const AIRTABLE_SOURCE: Readonly<Record<Source, string>> = {
  web: 'Website',
  bazaar: 'Bazaar',
}

export const EnterSubmission = z.object({
  name: z.string().trim().min(1, 'Required.').max(120),
  email: z.email('That address does not look right.').max(200),
  affiliation: z
    .string()
    .trim()
    .min(1, 'Required.')
    .max(160)
    .describe('Class year, school, or how you are connected to Yale.'),
  role: z.enum(ROLES),
  building: z
    .string()
    .trim()
    .min(1, 'Required.')
    .max(2000)
    .describe('What have you built, or what do you want to build?'),

  /**
   * THE CONSENT GATE. Boola's schema says `public_catalog_ok` is set only from
   * the person's own checkbox — never inferred, never defaulted true, never set
   * by a pipeline. It is the one thing standing between a submission and the
   * public catalog.
   */
  catalogConsent: z.boolean(),

  source: z.enum(SOURCES).default('web'),

  /**
   * Honeypot. Off-screen, never announced, never filled by a person.
   *
   * NOT validated — deliberately. An earlier version constrained this to
   * `.max(0)`, which meant zod rejected a filled honeypot BEFORE the trap could
   * spring: the client dead-ended silently with an error it never rendered, and
   * the server answered 400 naming the field, so one probe told a bot exactly
   * which field to omit. Leaving it unconstrained is what makes the server's
   * fake-success branch reachable.
   *
   * The name matters too. It used to be `company`, which password managers
   * autofill from the label — so a real person's submission would be silently
   * discarded as a bot. Nothing here matches an autofill heuristic.
   */
  confirmRef: z.string().optional(),
})

export type EnterSubmission = z.infer<typeof EnterSubmission>

export const resolveSource = (value: string | null | undefined): Source =>
  value === 'bazaar' ? 'bazaar' : 'web'

/** The confirmation line. In voice — not "Thanks for submitting!". */
export const CONFIRMATION = 'We’ll find you.'
