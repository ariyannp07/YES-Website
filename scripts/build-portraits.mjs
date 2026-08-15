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

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

const OUT_DIR = join(process.cwd(), 'public', 'portraits', 'generated')
const SIZE = 640
const QUALITY = 78

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

if (!token || !baseId) {
  console.log(
    'build:portraits SKIPPED — AIRTABLE_TOKEN / AIRTABLE_BASE_ID not set.\n' +
      'The mosaic renders placeholder silhouettes until the feed is connected.',
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
  console.error(`build:portraits FAILED to read Airtable: ${response.status} ${response.statusText}`)
  process.exit(1)
}

const { records = [] } = await response.json()
await mkdir(OUT_DIR, { recursive: true })

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

  try {
    const image = await fetch(url)
    if (!image.ok) throw new Error(`${image.status} ${image.statusText}`)

    const source = Buffer.from(await image.arrayBuffer())

    const base = sharp(source).resize(SIZE, SIZE, {
      fit: 'cover',
      position: 'attention',
    })

    const color = await base.clone().webp({ quality: QUALITY }).toBuffer()
    await writeFile(join(OUT_DIR, `${slug}-color.webp`), color)

    // Duotone: flatten to luminance, then remap that luminance between the two
    // endpoint colours. Baked in here so the browser never filters a full
    // colour image at paint time.
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
    written += 1
  } catch (error) {
    console.error(`build:portraits — ${name}: ${error.message}`)
    skipped += 1
  }
}

console.log(
  `build:portraits done — ${written} portrait pair(s) written, ${skipped} skipped.`,
)
