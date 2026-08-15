import 'server-only'

import {
  airtableConfig,
  asString,
  listRecords,
  type AirtableRecord,
} from '@/lib/airtable/client'
import { slugify, uniqueSlug } from '@/lib/slug'

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

  const records = await listRecords(config, config.peopleTable, {
    view: config.catalogView,
    fields: [...FIELDS],
  })

  const taken = new Set<string>()

  return records
    .map((record) => toBuilder(record, taken))
    .filter((builder): builder is Builder => builder !== null)
}
