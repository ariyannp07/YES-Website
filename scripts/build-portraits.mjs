#!/usr/bin/env node
/**
 * Portrait pipeline for the alumni mosaic.
 *
 * Build spec §3, performance & craft bar: "portraits served as optimized
 * duotone WebP/AVIF (the duotone treatment is done at build time, not with CSS
 * filters over full-colour images, so the page stays light)."
 *
 * Reads the consent-gated Alumni-Page-Feed, downloads each headshot, and writes
 * two derivatives per person into public/portraits/generated/:
 *   <slug>-duotone.webp   the resting state
 *   <slug>-color.webp     revealed on hover
 *
 * Airtable attachment URLs expire, which is exactly why the images are pulled
 * down at build time rather than hot-linked from the page.
 *
 * Run before `next build` whenever the feed changes:
 *   npm run build:portraits && npm run build
 */

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'
import curation from '../content/catalog/curation.json' with { type: 'json' }

const LOCAL_DIR = join(process.cwd(), 'content', 'catalog', 'portraits')

const OUT_DIR = join(process.cwd(), 'public', 'portraits', 'generated')
const SIZE = 640
const QUALITY = 78
const CONFIRMED_SLUGS = new Set(curation.people.map((person) => person.slug))

/** Duotone endpoints: Yale-blue shadow, warm-white highlight. */
const SHADOW = { r: 0x0d, g: 0x2b, b: 0x56 }
const HIGHLIGHT = { r: 0xf4, g: 0xf1, b: 0xea }

const token = process.env.AIRTABLE_TOKEN
const baseId = process.env.AIRTABLE_BASE_ID
const table = process.env.AIRTABLE_PEOPLE_TABLE ?? 'People'
const view = process.env.AIRTABLE_ALUMNI_VIEW ?? 'Alumni-Page-Feed'

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Write the duotone + colour pair for one person.
 *
 * Shared by both sources so a portrait looks identical whether it came from the
 * consented Airtable feed or from the curated directory in git.
 */
const writePair = async (slug, source) => {
  const base = sharp(source).resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })

  const color = await base.clone().webp({ quality: QUALITY }).toBuffer()
  await writeFile(join(OUT_DIR, `${slug}-color.webp`), color)

  // Duotone: flatten to luminance, then remap it between the two endpoint
  // colours. Baked here so the browser never filters a full-colour image at
  // paint time.
  const duotone = await base
    .clone()
    .greyscale()
    .linear(1.06, -8)
    .tint(HIGHLIGHT)
    .composite([
      {
        input: {
          create: {
            width: SIZE,
            height: SIZE,
            channels: 4,
            background: { ...SHADOW, alpha: 0.55 },
          },
        },
        blend: 'multiply',
      },
    ])
    .webp({ quality: QUALITY })
    .toBuffer()

  await writeFile(join(OUT_DIR, `${slug}-duotone.webp`), duotone)
}

await mkdir(OUT_DIR, { recursive: true })

// A removed person must stop being web-addressable on the next build. Source
// portraits stay archived under content/, while generated public derivatives
// are cleared and rebuilt only from the stored directory and confirmed feed.
const staleDerivatives = (await readdir(OUT_DIR)).filter((file) => file.endsWith('.webp'))
await Promise.all(staleDerivatives.map((file) => unlink(join(OUT_DIR, file))))

/**
 * Source 1 — the curated directory in git (content/catalog/portraits).
 *
 * These were collected from public pages rather than submitted by their
 * subjects, so they are NOT consent-gated data and deliberately do not travel
 * through Airtable. Provenance for every one is in that folder's SOURCES.csv.
 */
let localWritten = 0
try {
  const files = (await readdir(LOCAL_DIR)).filter(
    (file) => file.endsWith('.jpg'),
  )
  for (const file of files) {
    try {
      await writePair(file.replace(/\.jpg$/, ''), await readFile(join(LOCAL_DIR, file)))
      localWritten += 1
    } catch (error) {
      console.error(`build:portraits — ${file}: ${error.message}`)
    }
  }
} catch {
  // No local portraits yet; the mosaic falls back to monograms.
}
console.log(`build:portraits — ${localWritten} pair(s) from the stored directory.`)

if (!token || !baseId) {
  console.log(
    'build:portraits — AIRTABLE_TOKEN / AIRTABLE_BASE_ID not set, so the ' +
      'consented feed was skipped. Curated portraits above are still built.',
  )
  process.exit(0)
}

const query = new URLSearchParams({ view, pageSize: '100' })
for (const field of ['full_name', 'headshot', 'alumni_page_ok']) {
  query.append('fields[]', field)
}

const response = await fetch(
  `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${query}`,
  { headers: { Authorization: `Bearer ${token}` } },
)

if (!response.ok) {
  // NOT fatal, and this is load-bearing: since generation was chained into
  // `npm run build`, exiting non-zero here took the whole deployment down.
  // Production failed for ten hours on a 422 — the consent-gated view does not
  // exist yet — even though the curated portraits above had already been
  // written successfully.
  //
  // The feed is optional by design: the site is documented to build and render
  // with no credentials at all. A view that has not been created is a known
  // setup state, not a build error. Anyone who consented is simply not on the
  // wall until the view exists, which is the safe direction to fail.
  console.warn(
    `build:portraits — could not read the consented feed (${response.status} ` +
      `${response.statusText}). Curated portraits above were still written. ` +
      `If this is 422/404, the "${view}" view does not exist yet — see README.`,
  )
  process.exit(0)
}

const { records = [] } = await response.json()

let written = 0
let skipped = 0

for (const record of records) {
  // Defence in depth: the view filters on consent, and so does this script. A
  // portrait must never be processed for someone who has not opted in.
  if (record.fields.alumni_page_ok !== true) {
    skipped += 1
    continue
  }

  const name = record.fields.full_name
  const url = record.fields.headshot?.[0]?.url

  if (!name || !url) {
    skipped += 1
    continue
  }

  const slug = slugify(name)

  if (!CONFIRMED_SLUGS.has(slug)) {
    skipped += 1
    continue
  }

  try {
    const image = await fetch(url)
    if (!image.ok) throw new Error(`${image.status} ${image.statusText}`)

    // A consented headshot is the person's own, so it overwrites anything the
    // curated directory collected for them.
    await writePair(slug, Buffer.from(await image.arrayBuffer()))
    written += 1
  } catch (error) {
    console.error(`build:portraits — ${name}: ${error.message}`)
    skipped += 1
  }
}

console.log(
  `build:portraits done — ${written} portrait pair(s) written, ${skipped} skipped.`,
)
