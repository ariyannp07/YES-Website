#!/usr/bin/env node
/**
 * Import the owner-curated builder directory from CSV into repo content.
 *
 * WHY THIS IS NOT AIRTABLE. The Airtable feeds are consent-gated: a person
 * appears because they ticked `alumni_page_ok` or `public_catalog_ok`
 * themselves. This directory is assembled from public professional sources —
 * LinkedIn, company sites, press — and nobody in it has opted in. Writing these
 * rows through the consent gate would make that flag mean "someone typed this
 * in", which is exactly what canon 05-human-ai-policy R3 says it must never
 * mean. So the directory lives in git, clearly separate, and the consent gate
 * keeps meaning consent.
 *
 * Re-run after editing the CSV:  node scripts/import-catalog.mjs <path.csv>
 */

import { readFileSync, writeFileSync } from 'node:fs'
import supplement from '../content/catalog/supplement.json' with { type: 'json' }

const SOURCE =
  process.argv[2] ??
  new URL('../content/catalog/source/yale_builders_catalog_116.csv', import.meta.url)
const OUT = new URL('../content/catalog/builders.json', import.meta.url)

/**
 * Owner-chosen order for the top of the wall, from FEATURED_25.txt in the
 * portrait pack. This supersedes the earlier eight-name list; 'Rhea' appeared
 * there but is in neither the pack nor the directory, and is not in this 25.
 */
const FEATURED = [
  // Ariyan and Sofia are the co-presidents and sit together at the head of the
  // wall, at their direction. The rest keep FEATURED_25.txt's order.
  "Ariyan Patel",
  "Sofia Teifeld",
  "Oliver Hime",
  "Leïa Ryan",
  "James Masson",
  "Riya Bhargava",
  "Bruno Bruno",
  "Freeman Irabaruta",
  "Lucas Santos",
  "Joshua Gao",
  "Paul Douglass",
  "Osama Radi",
  "Allah-u-Abha Rodrigues",
  "Murad Abdukholikov",
  "Nicolas Gertler",
  "Amelie Liu",
  "Seth Goldin",
  "Grace Gerwe",
  "Teo Dimov",
  "Ari Strober",
  "Sina Dehghani",
  "Zain Anwar",
  "Yavin Fickel",
  "Kashi Tuteja",
  "Jasmine Garry",
]

/** Names the owners supplied a correction for; the CSV row is amended, not replaced. */
const CORRECTIONS = new Map(
  (supplement.corrections ?? []).map((c) => [c.matchName, c]),
)

/** RFC4180-ish parser: the file has quoted fields containing commas and newlines. */
const parseCsv = (text) => {
  const rows = []
  let row = [], field = '', quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 }
        else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const slugify = (value) =>
  value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const splitList = (value) =>
  (value || '').split(';').map((s) => s.trim()).filter(Boolean)

const raw = readFileSync(SOURCE, 'utf8').replace(/^﻿/, '')
const [header, ...body] = parseCsv(raw)
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))
const get = (row, col) => (row[idx[col]] ?? '').trim()

const taken = new Set()
const people = []

for (const row of body) {
  const name = get(row, 'Full Name')
  if (!name) continue

  let slug = slugify(get(row, 'Display Name') || name)
  let n = 2
  while (taken.has(slug)) slug = `${slugify(name)}-${n++}`
  taken.add(slug)

  const role = get(row, 'Current Role')
  const org = get(row, 'Current Organization')
  const venture = get(row, 'Primary Venture')
  const traction = get(row, 'Notable Proof / Traction')

  // One proof object, the strongest artifact available. Where there is real
  // traction that is the proof; otherwise the venture itself is the artifact.
  const proof = traction
    ? { kind: 'headline', value: traction, source: get(row, 'Primary Source URL') || undefined }
    : venture
      ? { kind: 'headline', value: venture, source: get(row, 'Product / What They Build') || undefined }
      : undefined

  const sectors = splitList(get(row, 'Sectors'))
  const fix = CORRECTIONS.get(name) ?? {}

  people.push({
    slug,
    name: get(row, 'Display Name') || name,
    classYear: fix.classYear ?? get(row, 'Yale Affiliation'),
    school: fix.school ?? get(row, 'Yale School'),
    nowLine: fix.nowLine ?? ([role, org].filter(Boolean).join(', ') || venture),
    venture: fix.venture ?? venture,
    bio: fix.bio ?? get(row, 'Short Bio'),
    sectors: fix.sectors ?? sectors,
    proof,
    companyUrl: get(row, 'Company Website') || get(row, 'Personal Website') || undefined,
    linkedinUrl: get(row, 'LinkedIn URL') || undefined,
    // Precomputed lowercase haystack — search must not rebuild this per keystroke.
    searchText: [
      name, role, org, venture, get(row, 'Yale Affiliation'), get(row, 'Yale School'),
      get(row, 'Short Bio'), get(row, 'Sectors'),
      get(row, 'Technologies / Technical Domains'),
      get(row, 'AI Search Keywords / Tags'),
      // Aliases and extra keywords are search-only: they never render, but they
      // mean a misspelling the owners gave us still finds the right person.
      ...(fix.aliases ?? []),
      fix.extraKeywords ?? '',
      fix.bio ?? '',
    ].filter(Boolean).join(' ').toLowerCase(),
    reviewNote: get(row, 'Publication Review') === 'Ready' ? undefined : get(row, 'Publication Review'),
  })
}

// Owner-supplied entries for people the CSV does not contain.
for (const entry of supplement.people ?? []) {
  let slug = slugify(entry.name)
  let n = 2
  while (taken.has(slug)) slug = `${slugify(entry.name)}-${n++}`
  taken.add(slug)

  people.push({
    slug,
    name: entry.name,
    classYear: entry.classYear ?? '',
    school: entry.school,
    nowLine: entry.nowLine,
    venture: entry.venture,
    bio: entry.bio,
    sectors: entry.sectors ?? [],
    proof: entry.proof,
    companyUrl: entry.companyUrl,
    linkedinUrl: entry.linkedinUrl,
    searchText: [
      entry.name, entry.nowLine, entry.venture, entry.classYear, entry.school,
      entry.bio, (entry.sectors ?? []).join(' '),
      ...(entry.aliases ?? []), entry.extraKeywords ?? '',
    ].filter(Boolean).join(' ').toLowerCase(),
    reviewNote: entry.reviewNote,
  })
}

// Featured first, in the owner's order; everyone else alphabetical.
const rank = new Map(FEATURED.map((n, i) => [n, i]))
const rankOf = (p) => {
  for (const [n, i] of rank) if (p.name === n) return i
  return Number.POSITIVE_INFINITY
}
people.forEach((p) => { p.featured = rankOf(p) !== Number.POSITIVE_INFINITY })
people.sort((a, b) => {
  const d = rankOf(a) - rankOf(b)
  return d !== 0 && Number.isFinite(Math.min(rankOf(a), rankOf(b)))
    ? d
    : a.name.localeCompare(b.name)
})

writeFileSync(OUT, `${JSON.stringify({ people }, null, 2)}\n`)

const missing = FEATURED.filter((n) => !people.some((p) => p.name === n))
const flagged = people.filter((p) => p.reviewNote)

console.log(`imported ${people.length} builders -> content/catalog/builders.json`)
console.log(`featured placed: ${FEATURED.length - missing.length}/${FEATURED.length}`)
if (missing.length) console.log(`  NOT IN THE CSV, so not featured: ${missing.join(', ')}`)
if (flagged.length) {
  console.log(`\n${flagged.length} row(s) the CSV flags as not publication-ready:`)
  for (const p of flagged) console.log(`  ${p.name} — ${p.reviewNote}`)
}
