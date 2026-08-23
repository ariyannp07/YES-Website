#!/usr/bin/env node
/**
 * Stage harvested portraits into the repo.
 *
 * Reads the output of scripts/portraits/harvest.py — a directory of square
 * JPEGs plus resolved_portrait_sources.csv — and writes:
 *
 *   content/catalog/portraits/<slug>.jpg   the source image, committed
 *   content/catalog/portraits/SOURCES.csv  where each one came from
 *   content/catalog/portraits.json         slug -> provenance, read at build
 *
 * The provenance file is the point. These portraits were collected from public
 * pages rather than submitted by their subjects, so every single one has to be
 * traceable to the page it came from — that is what makes a takedown request
 * answerable in seconds instead of a forensic exercise.
 *
 * Usage: node scripts/stage-portraits.mjs <harvest-dir>
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const harvestDir = process.argv[2]
if (!harvestDir) {
  console.error('usage: node scripts/stage-portraits.mjs <harvest-dir>')
  process.exit(1)
}

const OUT_DIR = join(process.cwd(), 'content', 'catalog', 'portraits')
const MANIFEST = join(process.cwd(), 'content', 'catalog', 'portraits.json')
const BUILDERS = join(process.cwd(), 'content', 'catalog', 'builders.json')

const slugify = (value) =>
  value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Minimal RFC4180 parser — fields here contain commas inside quoted URLs. */
const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c !== ''))
}

/**
 * Strip credential-bearing query parameters before recording a URL.
 *
 * Y Combinator serves avatars from S3 with presigned tokens (X-Amz-Signature
 * and friends). They expire within the hour and are useless to anyone, but
 * nothing credential-shaped belongs in git. Other query parameters are kept —
 * Next.js image URLs need ?url=&w= to resolve at all.
 */
const cleanUrl = (raw) => {
  try {
    const u = new URL(raw)
    for (const k of [...u.searchParams.keys()]) {
      if (/^x-amz-/i.test(k)) u.searchParams.delete(k)
    }
    return u.toString()
  } catch {
    return raw
  }
}

const csvPath = join(harvestDir, 'resolved_portrait_sources.csv')
if (!existsSync(csvPath)) {
  console.error(`no resolved_portrait_sources.csv in ${harvestDir}`)
  process.exit(1)
}

const [header, ...body] = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''))
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))

const { people } = JSON.parse(readFileSync(BUILDERS, 'utf8'))
const bySlug = new Map(people.map((p) => [p.slug, p]))
const byName = new Map(people.map((p) => [slugify(p.name), p]))

mkdirSync(OUT_DIR, { recursive: true })

const staged = {}
const unmatched = []

for (const row of body) {
  const name = row[idx['full_name']]
  const file = row[idx['target_filename']]
  const src = join(harvestDir, 'portraits_out', file)
  if (!existsSync(src)) continue

  const slug = slugify(name)
  const person = bySlug.get(slug) ?? byName.get(slug)
  if (!person) { unmatched.push(name); continue }

  copyFileSync(src, join(OUT_DIR, `${person.slug}.jpg`))
  staged[person.slug] = {
    name: person.name,
    imageUrl: cleanUrl(row[idx['image_url']]),
    sourcePage: row[idx['source_page']],
    evidence: row[idx['evidence']],
    pageTier: row[idx['page_tier']],
  }
}

const slugs = Object.keys(staged).sort()

writeFileSync(
  join(OUT_DIR, 'SOURCES.csv'),
  'slug,name,source_page,image_url,evidence\n' +
    slugs.map((s) => {
      const d = staged[s]
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      return [s, q(d.name), q(d.sourcePage), q(d.imageUrl), d.evidence].join(',')
    }).join('\n') + '\n',
)

writeFileSync(MANIFEST, `${JSON.stringify({ portraits: staged }, null, 2)}\n`)

console.log(`staged ${slugs.length} portrait(s) into content/catalog/portraits/`)
if (unmatched.length) {
  console.log(`unmatched against builders.json (${unmatched.length}): ${unmatched.join(', ')}`)
}
