import { z } from 'zod'

/**
 * SPECTRE — the application.
 *
 * Three questions and nothing else. One schema, imported by both the browser
 * form and the server route, so the client cannot accept something the server
 * will reject and the server never takes the client's word for it.
 *
 * Note what is NOT here: no catalog consent. This form never asks for it, so it
 * can never set `public_catalog_ok` — which stays exactly what Boola's schema
 * says it is, a flag set only from a person's own checkbox.
 */
export const SpectreApplication = z.object({
  name: z.string().trim().min(1, 'Required.').max(120),
  email: z.email('That address does not look right.').max(200),
  why: z
    .string()
    .trim()
    .min(1, 'Required.')
    .max(2000)
    .describe('Why you.'),

  /**
   * Honeypot. Off-screen, never announced, never filled by a person.
   *
   * NOT validated — deliberately. An earlier version constrained this to
   * `.max(0)`, which meant zod rejected a filled honeypot BEFORE the trap could
   * spring: the client dead-ended silently with an error it never rendered, and
   * the server answered 400 naming `confirm_ref`, so one probe told a bot
   * exactly which field to omit. Leaving it unconstrained is what makes the
   * server's fake-success branch reachable.
   *
   * The name matters too. It used to be `company`, which password managers
   * autofill from the label — so a real applicant's submission would be
   * silently discarded as a bot. Nothing here matches an autofill heuristic.
   */
  confirmRef: z.string().optional(),
})

export type SpectreApplication = z.infer<typeof SpectreApplication>

/** The confirmation. Deliberately not a receipt. */
export const CONFIRMATION = 'You may hear from us soon.'
