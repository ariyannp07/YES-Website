#!/usr/bin/env node
/**
 * Build spec §3, /alumni editorial rules (binding):
 *   "No adjectives. Not 'brilliant,' 'passionate,' 'visionary,' or
 *    'innovative' — anywhere on this page. Accomplishments speak in nouns,
 *    numbers, and artifacts or they don't ship. … any copy review that finds an
 *    adjective describing a person fails."
 *
 * Run against the live Alumni-Page-Feed before a deploy. Without credentials it
 * reports that it could not check rather than passing silently — a check that
 * quietly no-ops is worse than no check.
 *
 * Also screens the canon 03-brand-voice §4 banned list, which applies site-wide.
 */

const PERSON_ADJECTIVES = [
  'brilliant', 'passionate', 'visionary', 'innovative', 'exceptional',
  'talented', 'driven', 'dynamic', 'inspiring', 'remarkable', 'incredible',
  'amazing', 'outstanding', 'stellar', 'legendary', 'prolific', 'renowned',
  'accomplished', 'seasoned', 'world-class', 'best-in-class', 'rockstar',
  'genius', 'gifted', 'extraordinary', 'phenomenal', 'unparalleled',
  'trailblazing', 'pioneering', 'groundbreaking', 'thought-leading',
]

const BANNED_PHRASES = [
  'leverage synergies', 'unlock value', 'ecosystem play', 'high-impact',
  'game-changing', 'revolutionary', 'disruptive', 'passionate about',
  'thought leadership', 'first-of-its-kind', 'unprecedented',
]

const FIELDS = ['full_name', 'now_line', 'proof_value', 'proof_source', 'own_words']

const token = process.env.AIRTABLE_TOKEN
const baseId = process.env.AIRTABLE_BASE_ID
const table = process.env.AIRTABLE_PEOPLE_TABLE ?? 'People'
const view = process.env.AIRTABLE_ALUMNI_VIEW ?? 'Alumni-Page-Feed'

if (!token || !baseId) {
  console.log(
    'Adjective check SKIPPED — AIRTABLE_TOKEN / AIRTABLE_BASE_ID not set.\n' +
      'There are no live dossiers to check yet. Re-run this before the first\n' +
      'deploy that carries real alumni copy.',
  )
  process.exit(0)
}

const query = new URLSearchParams({ view, pageSize: '100' })
for (const field of FIELDS) query.append('fields[]', field)

const response = await fetch(
  `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${query}`,
  { headers: { Authorization: `Bearer ${token}` } },
)

if (!response.ok) {
  console.error(`Adjective check FAILED to read Airtable: ${response.status} ${response.statusText}`)
  process.exit(1)
}

const { records = [] } = await response.json()
const findings = []

const scan = (name, field, value) => {
  if (typeof value !== 'string') return
  const haystack = value.toLowerCase()

  for (const word of PERSON_ADJECTIVES) {
    if (new RegExp(`\\b${word}\\b`).test(haystack)) {
      findings.push(`${name} · ${field}: "${word}"`)
    }
  }
  for (const phrase of BANNED_PHRASES) {
    if (haystack.includes(phrase)) {
      findings.push(`${name} · ${field}: "${phrase}"`)
    }
  }
}

for (const record of records) {
  const name = record.fields.full_name ?? record.id
  for (const field of FIELDS) {
    if (field === 'full_name') continue
    scan(name, field, record.fields[field])
  }
}

if (findings.length > 0) {
  console.error(`\nAdjective check FAILED — ${findings.length} finding(s):\n`)
  for (const finding of findings) console.error(`  ${finding}`)
  console.error(
    '\nBuild spec §3: accomplishments speak in nouns, numbers and artifacts.\n' +
      'Rewrite the field in Airtable, then re-run.\n',
  )
  process.exit(1)
}

console.log(`Adjective check passed — ${records.length} dossier(s) clean.`)
