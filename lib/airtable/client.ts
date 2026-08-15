import 'server-only'

/**
 * Airtable REST client. SERVER ONLY.
 *
 * `import 'server-only'` makes it a build error for any client component to
 * pull this in, which is the mechanical version of build spec §6's rule:
 * "Never expose the Airtable key client-side." No key belongs in a
 * NEXT_PUBLIC_ variable and none is read here from one.
 */

const API_ROOT = 'https://api.airtable.com/v0'

export interface AirtableConfig {
  readonly token: string
  readonly baseId: string
  readonly peopleTable: string
  readonly logTable: string
  readonly catalogView: string
  readonly alumniView: string
}

/**
 * Returns null when the base is not configured — a legitimate state, not an
 * error. Pages render their placeholder or dark state instead of failing.
 */
export const airtableConfig = (): AirtableConfig | null => {
  const token = process.env.AIRTABLE_TOKEN
  const baseId = process.env.AIRTABLE_BASE_ID

  if (!token || !baseId) return null

  return {
    token,
    baseId,
    peopleTable: process.env.AIRTABLE_PEOPLE_TABLE ?? 'People',
    logTable: process.env.AIRTABLE_LOG_TABLE ?? 'Log',
    catalogView: process.env.AIRTABLE_CATALOG_VIEW ?? 'Public-Catalog-Feed',
    alumniView: process.env.AIRTABLE_ALUMNI_VIEW ?? 'Alumni-Page-Feed',
  }
}

export interface AirtableRecord {
  readonly id: string
  readonly fields: Readonly<Record<string, unknown>>
}

interface ListResponse {
  readonly records?: readonly AirtableRecord[]
  readonly offset?: string
}

const MAX_PAGES = 20

const authHeaders = (config: AirtableConfig): Record<string, string> => ({
  Authorization: `Bearer ${config.token}`,
  'Content-Type': 'application/json',
})

const describeFailure = async (response: Response): Promise<string> => {
  const body = await response.text().catch(() => '')
  return `Airtable ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 400)}` : ''}`
}

/**
 * Read every record from a view, following pagination.
 *
 * `fields` is an explicit ALLOWLIST, never "all fields except" — canon
 * 05-human-ai-policy R3. Adding a field to a public page is a diff a reviewer
 * can see in one place.
 */
export const listRecords = async (
  config: AirtableConfig,
  table: string,
  options: { readonly view: string; readonly fields: readonly string[] },
): Promise<readonly AirtableRecord[]> => {
  const collected: AirtableRecord[] = []
  let offset: string | undefined

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ view: options.view, pageSize: '100' })
    for (const field of options.fields) query.append('fields[]', field)
    if (offset) query.set('offset', offset)

    const response = await fetch(
      `${API_ROOT}/${config.baseId}/${encodeURIComponent(table)}?${query}`,
      { headers: authHeaders(config) },
    )

    if (!response.ok) throw new Error(await describeFailure(response))

    const payload = (await response.json()) as ListResponse
    collected.push(...(payload.records ?? []))

    if (!payload.offset) return collected
    offset = payload.offset
  }

  throw new Error(
    `Airtable pagination exceeded ${MAX_PAGES} pages for ${table}/${options.view}. ` +
      'Refusing to loop; check the view filter.',
  )
}

/** Create one record. Returns its id. */
export const createRecord = async (
  config: AirtableConfig,
  table: string,
  fields: Readonly<Record<string, unknown>>,
): Promise<string> => {
  const response = await fetch(
    `${API_ROOT}/${config.baseId}/${encodeURIComponent(table)}`,
    {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify({ records: [{ fields }], typecast: false }),
      cache: 'no-store',
    },
  )

  if (!response.ok) throw new Error(await describeFailure(response))

  const payload = (await response.json()) as {
    readonly records?: readonly { readonly id: string }[]
  }

  const id = payload.records?.[0]?.id
  if (!id) throw new Error('Airtable accepted the write but returned no record id.')

  return id
}

/** Read a string field, tolerating Airtable's empty-cell shapes. */
export const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (typeof value === 'number') return String(value)
  return undefined
}

/** First attachment URL, if the field holds attachments. */
export const asAttachmentUrl = (value: unknown): string | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const first = value[0] as { readonly url?: unknown }
  return typeof first?.url === 'string' ? first.url : undefined
}
