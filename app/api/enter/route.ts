import { NextResponse } from 'next/server'

import { airtableConfig, createRecord } from '@/lib/airtable/client'
import { writeLog } from '@/lib/airtable/log'
import { AIRTABLE_SOURCE, EnterSubmission } from '@/lib/enter-schema'
import { clientKey, hit } from '@/lib/rate-limit'

/**
 * The only server route on the site.
 *
 * It exists because build spec §6 forbids exposing the Airtable key
 * client-side, and a static export has nowhere to keep it. Everything else on
 * this site is static.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** User-facing copy stays in voice; detail goes to the server log. */
const MESSAGES = {
  invalid: 'Something in the form did not go through. Check the fields marked below.',
  unconfigured:
    'The form is not connected yet. Write to ariyan.patel@yale.edu in the meantime.',
  rateLimited: 'Too many attempts. Wait a minute.',
  failed: 'That did not save. Try again, or write to ariyan.patel@yale.edu.',
} as const

export async function POST(request: Request) {
  const limit = hit(clientKey(request.headers))
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: MESSAGES.rateLimited },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: MESSAGES.invalid },
      { status: 400 },
    )
  }

  const parsed = EnterSubmission.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: MESSAGES.invalid,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const submission = parsed.data

  // Honeypot. Answer as though it succeeded — a bot learns nothing, and no
  // record is written.
  if (submission.company) {
    console.warn('[enter] honeypot triggered; submission discarded.')
    return NextResponse.json({ ok: true })
  }

  const config = airtableConfig()
  if (!config) {
    console.warn('[enter] AIRTABLE_TOKEN / AIRTABLE_BASE_ID not set; nothing written.')
    return NextResponse.json(
      { ok: false, message: MESSAGES.unconfigured },
      { status: 503 },
    )
  }

  const inputRef = `web intake · ${submission.email} · src=${submission.source}`

  try {
    const recordId = await createRecord(config, config.peopleTable, {
      full_name: submission.name,
      emails: submission.email,
      yale_affiliation: submission.affiliation,
      builder_profile: submission.building,
      // A submitter is 'Student' by default; the role they picked is recorded
      // in the profile text. Type is curated by a human, not inferred here.
      status: 'New',
      source: AIRTABLE_SOURCE[submission.source],
      // THE CONSENT GATE. Set from the person's own checkbox and nothing else.
      public_catalog_ok: submission.catalogConsent,
    })

    // R2: every run writes a row. A logging failure must not lose the person's
    // submission, which has already succeeded.
    await writeLog({
      workflow: 'intake',
      inputRef,
      outputRef: `People/${recordId}`,
      outcome: `created · role=${submission.role} · catalog_consent=${submission.catalogConsent}`,
    }).catch((error: unknown) => {
      console.error('[enter] record written but Log row failed:', error)
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[enter] Airtable write failed:', error)

    // "A failed run still writes a row."
    await writeLog({
      workflow: 'intake',
      inputRef,
      outputRef: '',
      outcome: `failed · ${error instanceof Error ? error.message : 'unknown error'}`,
    }).catch(() => {
      console.error('[enter] failure could not be logged either.')
    })

    return NextResponse.json(
      { ok: false, message: MESSAGES.failed },
      { status: 502 },
    )
  }
}
