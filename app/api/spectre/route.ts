import { NextResponse } from 'next/server'

import { airtableConfig, createRecord } from '@/lib/airtable/client'
import { writeLog } from '@/lib/airtable/log'
import { clientKey, hit } from '@/lib/rate-limit'
import { SpectreApplication } from '@/lib/spectre-schema'

/**
 * Spectre applications land in the same State as everything else — the site is
 * an AINS interface, so a second intake surface must not become a second
 * database.
 *
 * SCHEMA NOTE for the owners: this writes to `People` with source `Website` and
 * marks the record in `builder_profile`, because Boola's `SOURCES` enum has no
 * Spectre value and this route will not invent one. If Spectre applications
 * should be separable in Airtable, add either a `Spectre` source option or a
 * link to a Spectre row in `Programs`, and this route gains one field.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MESSAGES = {
  invalid: 'Something did not go through. Check the fields below.',
  unconfigured: 'Not open yet. Write to ariyan.patel@yale.edu in the meantime.',
  rateLimited: 'Too many attempts. Wait a minute.',
  failed: 'That did not save. Try again, or write to ariyan.patel@yale.edu.',
} as const

export async function POST(request: Request) {
  const limit = hit(`spectre:${clientKey(request.headers)}`)
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
    return NextResponse.json({ ok: false, message: MESSAGES.invalid }, { status: 400 })
  }

  const parsed = SpectreApplication.safeParse(payload)
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

  const application = parsed.data

  // Honeypot. Reachable only because `confirmRef` is unvalidated: when it was
  // constrained to `.max(0)`, zod returned 400 above and this branch was dead
  // code that also told a bot exactly which field to omit. Answer as though it
  // succeeded — a bot learns nothing, and no record is written.
  if (application.confirmRef) {
    console.warn('[spectre] honeypot triggered; application discarded.')
    return NextResponse.json({ ok: true })
  }

  const config = airtableConfig()
  if (!config) {
    console.warn('[spectre] Airtable not configured; nothing written.')
    return NextResponse.json(
      { ok: false, message: MESSAGES.unconfigured },
      { status: 503 },
    )
  }

  const inputRef = `spectre application · ${application.email}`

  try {
    const recordId = await createRecord(config, config.peopleTable, {
      full_name: application.name,
      emails: application.email,
      builder_profile: `[SPECTRE APPLICATION]\n\n${application.why}`,
      status: 'New',
      source: 'Website',
      // Never set from this form: it does not ask for catalog consent.
      public_catalog_ok: false,
    })

    await writeLog({
      workflow: 'intake',
      inputRef,
      outputRef: `People/${recordId}`,
      outcome: 'created · spectre application',
    }).catch((error: unknown) => {
      console.error('[spectre] record written but Log row failed:', error)
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[spectre] Airtable write failed:', error)

    // "A failed run still writes a row." (canon R2)
    await writeLog({
      workflow: 'intake',
      inputRef,
      outputRef: '',
      outcome: `failed · ${error instanceof Error ? error.message : 'unknown error'}`,
    }).catch(() => {
      console.error('[spectre] failure could not be logged either.')
    })

    return NextResponse.json({ ok: false, message: MESSAGES.failed }, { status: 502 })
  }
}
