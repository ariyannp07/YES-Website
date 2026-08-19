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
   * Honeypot. A real person never sees this field, so anything in it is a bot.
   * Preferred over a CAPTCHA, which the safety rules forbid solving and which
   * would wreck the tone of this page anyway.
   */
  company: z.string().max(0).optional(),
})

export type SpectreApplication = z.infer<typeof SpectreApplication>

/** The confirmation. Deliberately not a receipt. */
export const CONFIRMATION = 'You may hear from us soon.'
