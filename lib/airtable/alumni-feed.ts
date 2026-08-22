import 'server-only'

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  airtableConfig,
  asAttachmentUrl,
  asString,
  listRecords,
  MissingViewError,
  type AirtableRecord,
} from '@/lib/airtable/client'
import { PROOF_KINDS, type Alumnus, type ProofObject } from '@/lib/alumni'
import { slugify, uniqueSlug } from '@/lib/slug'

/**
 * The consent-gated alumni feed.
 *
 * Reads ONLY the `Alumni-Page-Feed` view, which filters on `alumni_page_ok`.
 * The field list is an explicit allowlist (canon 05-human-ai-policy R3), and
 * `alumni_page_ok` is re-checked here even though the view already filters —
 * a mis-edited view must not be the only thing standing between a person and
 * publication.
 *
 * SCHEMA ADDITIONS REQUIRED on Boola's People table (build spec §3):
 *   now_line          singleLineText
 *   proof_kind        singleSelect  — number | headline | image | link
 *   proof_value       singleLineText
 *   proof_source      singleLineText
 *   own_words         multilineText
 *   headshot          multipleAttachments
 *   company_url       url
 *   linkedin_url      url
 *   alumni_weight     number        — 1 standard, 2 anchor story
 *   alumni_page_ok    checkbox      — THE CONSENT GATE
 *
 * DEVIATION from build spec §3, which names a single `proof_object` field
 * carrying "type + value + source". Three columns instead: Airtable has no
 * struct type, so one column would mean parsing a blob, and a malformed cell
 * would fail silently. Three typed columns fail visibly and are editable by a
 * non-technical owner. Same data, same allowlist.
 */

const FIELDS = [
  'full_name',
  'yale_affiliation',
  'now_line',
  'proof_kind',
  'proof_value',
  'proof_source',
  'own_words',
  'headshot',
  'company_url',
  'linkedin_url',
  'alumni_weight',
  'alumni_page_ok',
] as const

const PORTRAIT_DIR = join(process.cwd(), 'public', 'portraits', 'generated')

const isProofKind = (value: string): value is ProofObject['kind'] =>
  (PROOF_KINDS as readonly string[]).includes(value)

/** Only reference a portrait the build actually produced. */
const portraitIfPresent = (slug: string, variant: string): string | undefined => {
  const fileName = `${slug}-${variant}.webp`
  return existsSync(join(PORTRAIT_DIR, fileName))
    ? `/portraits/generated/${fileName}`
    : undefined
}

const toAlumnus = (
  record: AirtableRecord,
  taken: Set<string>,
): Alumnus | null => {
  const fields = record.fields

  // Defence in depth: the view filters on consent, and so do we.
  if (fields.alumni_page_ok !== true) return null

  const name = asString(fields.full_name)
  const nowLine = asString(fields.now_line)
  const proofValue = asString(fields.proof_value)

  // A row missing the essentials is skipped rather than half-rendered. The
  // dossier's whole job is one concrete artifact; without it there is no
  // dossier.
  if (!name || !nowLine || !proofValue) {
    console.warn(
      `[alumni-feed] skipping ${record.id}: needs full_name, now_line and proof_value.`,
    )
    return null
  }

  const slug = uniqueSlug(slugify(name), taken)
  taken.add(slug)

  const rawKind = asString(fields.proof_kind) ?? 'number'
  const kind = isProofKind(rawKind) ? rawKind : 'number'

  const headshotUrl = asAttachmentUrl(fields.headshot)

  if (headshotUrl && !portraitIfPresent(slug, 'duotone')) {
    console.warn(
      `[alumni-feed] ${name} has a headshot in Airtable but no processed portrait. ` +
        'Run `npm run build:portraits` before building, or the tile falls back to a silhouette.',
    )
  }

  return {
    slug,
    name,
    classYear: asString(fields.yale_affiliation) ?? '',
    nowLine,
    proof: {
      kind,
      value: proofValue,
      source: asString(fields.proof_source),
    },
    ownWords: asString(fields.own_words),
    portraitDuotone: portraitIfPresent(slug, 'duotone'),
    portraitColor: portraitIfPresent(slug, 'color'),
    companyUrl: asString(fields.company_url),
    linkedinUrl: asString(fields.linkedin_url),
    weight: Number(fields.alumni_weight) === 2 ? 2 : 1,
    placeholder: false,
  }
}

/**
 * Returns null — not [] — when the view does not exist yet, so the caller can
 * tell "set up, nobody consented" (an empty wall is right) apart from "not set
 * up yet" (placeholders are right).
 */
export const fetchAlumniFeed = async (): Promise<readonly Alumnus[] | null> => {
  const config = airtableConfig()
  if (!config) return []

  let records: readonly AirtableRecord[]

  try {
    records = await listRecords(config, config.peopleTable, {
      view: config.alumniView,
      fields: [...FIELDS],
    })
  } catch (error: unknown) {
    // The view has not been made yet. Airtable has no create-view API, so this
    // is a normal step in setting the base up — the wall shows placeholder
    // silhouettes until the view exists. Any OTHER Airtable failure still
    // throws, because a silently-empty catalog is worse than a red build.
    if (error instanceof MissingViewError) {
      console.warn(
        `[alumni-feed] ${error.message} The catalog will render placeholders ` +
          'until it is created. See README → "Creating the two views".',
      )
      return null
    }
    throw error
  }

  const taken = new Set<string>()

  return records
    .map((record) => toAlumnus(record, taken))
    .filter((person): person is Alumnus => person !== null)
}
