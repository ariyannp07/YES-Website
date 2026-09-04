import 'server-only'

import curation from '@/content/catalog/curation.json'
import {
  airtableConfig,
  asString,
  listRecords,
  MissingViewError,
  type AirtableRecord,
} from '@/lib/airtable/client'
import { slugify, uniqueSlug } from '@/lib/slug'

const PUBLIC_NAMES = new Set(
  curation.people.flatMap((person) =>
    [person.name, 'sourceName' in person ? person.sourceName : undefined].filter(
      (name): name is string => Boolean(name),
    ),
  ),
)

/**
 * The public builder catalog (build spec §3, /builders).
 *
 * Reads ONLY the `Public-Catalog-Feed` view, which filters on
 * `public_catalog_ok` — the consent checkbox the person ticked themselves.
 * The field list is an explicit allowlist and `public_catalog_ok` is re-checked
 * here (canon 05-human-ai-policy R3: records without consent are excluded from
 * the payload entirely, never emitted with nulls).
 *
 * `signal_strength`, `outreach_angle`, `deal_terms` and every other internal
 * field are absent from FIELDS and therefore never leave Airtable.
 */

const FIELDS = [
  'full_name',
  'yale_affiliation',
  'builder_profile',
  'public_catalog_ok',
] as const

export interface Builder {
  readonly slug: string
  readonly name: string
  readonly affiliation: string
  readonly profile: string
}

const toBuilder = (
  record: AirtableRecord,
  taken: Set<string>,
): Builder | null => {
  if (record.fields.public_catalog_ok !== true) return null

  const name = asString(record.fields.full_name)
  const profile = asString(record.fields.builder_profile)

  if (!name || !profile) return null

  const slug = uniqueSlug(slugify(name), taken)
  taken.add(slug)

  return {
    slug,
    name,
    affiliation: asString(record.fields.yale_affiliation) ?? '',
    profile,
  }
}

export const fetchCatalogFeed = async (): Promise<readonly Builder[]> => {
  const config = airtableConfig()
  if (!config) return []

  let records: readonly AirtableRecord[]

  try {
    records = await listRecords(config, config.peopleTable, {
      view: config.catalogView,
      fields: [...FIELDS],
    })
  } catch (error: unknown) {
    // See alumni-feed: a view that does not exist yet is a setup state, not a
    // failure. Everything else still throws.
    if (error instanceof MissingViewError) {
      console.warn(
        `[catalog-feed] ${error.message} /builders stays dark until it is created.`,
      )
      return []
    }
    throw error
  }

  const taken = new Set<string>()

  return records
    .map((record) => toBuilder(record, taken))
    .filter((builder): builder is Builder => builder !== null)
    .filter((builder) => PUBLIC_NAMES.has(builder.name))
}
