import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { marked } from 'marked'
import { z } from 'zod'

/**
 * The Reservoir — the public collection: essays and dispatches, the speaker
 * series, workshops, and online lessons. One index, reverse-chronological,
 * everything YES puts out in the open.
 *
 * Markdown in the repo, no CMS (build spec §6), so the site's content stays in
 * Git alongside the Canon. Read at BUILD time only: adding an entry is a commit
 * and a deploy.
 *
 * An entry either carries its own body (a piece that lives on this site) or an
 * external `url` (a recorded talk, a workshop hand-out, a hosted lesson). The
 * second kind gets an index row and no page of its own — the Reservoir points
 * at it rather than re-hosting it.
 */

const RESERVOIR_DIR = join(process.cwd(), 'content', 'reservoir')

export const KINDS = ['essay', 'talk', 'workshop', 'lesson'] as const
export type Kind = (typeof KINDS)[number]

export const KIND_LABELS: Readonly<Record<Kind, string>> = {
  essay: 'Essay',
  talk: 'Talk',
  workshop: 'Workshop',
  lesson: 'Lesson',
}

/** Frontmatter contract. A malformed entry fails the build rather than half-rendering. */
const Frontmatter = z.object({
  title: z.string().min(1),
  /** ISO date, e.g. 2026-08-15. Drives reverse-chronological order. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  kind: z.enum(KINDS).default('essay'),
  summary: z.string().min(1).optional(),
  /** Set for anything hosted elsewhere. No page is generated when present. */
  url: z.string().url().optional(),
  /** Copy ships only after owner sign-off (build spec §8.4). */
  approved: z.boolean().default(false),
})

export interface Entry {
  readonly slug: string
  readonly title: string
  readonly date: string
  readonly kind: Kind
  readonly summary?: string
  readonly url?: string
  readonly approved: boolean
  readonly html: string
}

/** Index row — an entry, or a page that lives elsewhere on this site. */
export interface ReservoirItem {
  readonly href: string
  readonly title: string
  readonly date: string
  readonly kind: Kind
  readonly summary?: string
  readonly external: boolean
}

/**
 * Minimal frontmatter parser: `key: value` lines between `---` fences.
 * Deliberately not a YAML engine — the contract above is the whole schema, and
 * anything it does not cover should fail loudly rather than parse surprisingly.
 */
const splitFrontmatter = (
  raw: string,
): { readonly data: Record<string, unknown>; readonly body: string } => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }

  const data: Record<string, unknown> = {}

  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line.trim())
    if (!pair) continue

    const value = pair[2].trim().replace(/^["']|["']$/g, '')
    if (value.length === 0) continue

    data[pair[1]] = value === 'true' ? true : value === 'false' ? false : value
  }

  return { data, body: match[2] }
}

const readEntryFile = (fileName: string): Entry => {
  const slug = fileName.replace(/\.md$/, '')
  const raw = readFileSync(join(RESERVOIR_DIR, fileName), 'utf8')
  const { data, body } = splitFrontmatter(raw)

  const parsed = Frontmatter.safeParse(data)
  if (!parsed.success) {
    throw new Error(
      `content/reservoir/${fileName}: invalid frontmatter — ${parsed.error.message}`,
    )
  }

  return {
    slug,
    title: parsed.data.title,
    date: parsed.data.date,
    kind: parsed.data.kind,
    summary: parsed.data.summary,
    url: parsed.data.url,
    approved: parsed.data.approved,
    html: marked.parse(body, { async: false }),
  }
}

/** Files beginning with `_` or `.` are notes to the owners, not entries. */
const isEntryFile = (name: string): boolean =>
  name.endsWith('.md') && !name.startsWith('_') && !name.startsWith('.')

export const allEntries = (): readonly Entry[] => {
  let fileNames: readonly string[]

  try {
    fileNames = readdirSync(RESERVOIR_DIR)
  } catch {
    // No reservoir directory yet is a valid state, not an error.
    return []
  }

  return fileNames
    .filter(isEntryFile)
    .map(readEntryFile)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Only entries that have a page here. Anything with a `url` lives elsewhere. */
export const entryBySlug = (slug: string): Entry | undefined =>
  allEntries().find((entry) => entry.slug === slug && !entry.url)
