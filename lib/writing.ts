import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { marked } from 'marked'
import { z } from 'zod'

/**
 * Essays and dispatches (build spec §3, §6): markdown in the repo, no CMS, so
 * the site's content stays in Git alongside the Canon.
 *
 * Read at BUILD time only. Adding an essay is a commit and a deploy.
 */

const WRITING_DIR = join(process.cwd(), 'content', 'writing')

/** Frontmatter contract. A malformed essay fails the build rather than half-rendering. */
const Frontmatter = z.object({
  title: z.string().min(1),
  /** ISO date, e.g. 2026-08-15. Drives reverse-chronological order. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  summary: z.string().min(1).optional(),
  /** Copy ships only after owner sign-off (build spec §8.4). */
  approved: z.boolean().default(false),
})

export interface Essay {
  readonly slug: string
  readonly title: string
  readonly date: string
  readonly summary?: string
  readonly approved: boolean
  readonly html: string
}

/** Index entry — an essay, or a page that lives elsewhere (the manifesto). */
export interface WritingEntry {
  readonly href: string
  readonly title: string
  readonly date: string
  readonly summary?: string
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
    data[pair[1]] =
      value === 'true' ? true : value === 'false' ? false : value
  }

  return { data, body: match[2] }
}

const readEssayFile = (fileName: string): Essay => {
  const slug = fileName.replace(/\.md$/, '')
  const raw = readFileSync(join(WRITING_DIR, fileName), 'utf8')
  const { data, body } = splitFrontmatter(raw)

  const parsed = Frontmatter.safeParse(data)
  if (!parsed.success) {
    throw new Error(
      `content/writing/${fileName}: invalid frontmatter — ${parsed.error.message}`,
    )
  }

  return {
    slug,
    title: parsed.data.title,
    date: parsed.data.date,
    summary: parsed.data.summary,
    approved: parsed.data.approved,
    html: marked.parse(body, { async: false }),
  }
}

/** Files beginning with `_` or `.` are notes to the owners, not essays. */
const isEssayFile = (name: string): boolean =>
  name.endsWith('.md') && !name.startsWith('_') && !name.startsWith('.')

export const allEssays = (): readonly Essay[] => {
  let fileNames: readonly string[]

  try {
    fileNames = readdirSync(WRITING_DIR)
  } catch {
    // No essays directory yet is a valid state, not an error.
    return []
  }

  return fileNames
    .filter(isEssayFile)
    .map(readEssayFile)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const essayBySlug = (slug: string): Essay | undefined =>
  allEssays().find((essay) => essay.slug === slug)
