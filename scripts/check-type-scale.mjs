#!/usr/bin/env node
/**
 * Build spec §4, scale discipline (binding):
 *   "define exactly two working text sizes per page — display and small — plus
 *    the timestamp micro-size. If a design review finds three or more mid-range
 *    sizes on a page, it fails review."
 *
 * A rule that depends on a reviewer noticing is a rule that erodes. This makes
 * it mechanical: app/globals.css is the only file allowed to declare a literal
 * font-size. Everywhere else may only reference a token (var(--text-*)) or
 * inherit. Tailwind text-* size utilities are caught too.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const ROOT = process.cwd()
const TOKEN_FILE = join('app', 'globals.css')
const SEARCH_DIRS = ['app', 'components', 'lib', 'content']
const EXTENSIONS = new Set(['.css', '.ts', '.tsx', '.js', '.jsx'])
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'generated'])

/**
 * Capture the declared value, then test it — rather than trying to express
 * "not a token" as a lookahead, which backtracks past leading whitespace and
 * silently passes everything.
 */
const CSS_FONT_SIZE = /font-size\s*:\s*([^;{}]+)/gi
const JSX_FONT_SIZE = /fontSize\s*:\s*([^,}\n]+)/g

/**
 * The only permitted values: a scale token, or inheriting one.
 *
 * Token names may be hyphenated (--text-card-name), which the catalog scope
 * needs — its scale has more steps than display/small/micro and they deserve
 * legible names. The rule being enforced is unchanged: a size must be DEFINED
 * in app/globals.css and merely REFERENCED here.
 */
const ALLOWED_VALUE =
  /^\s*['"`]?\s*(?:var\(\s*--text-[a-z][a-z-]*\s*\)|inherit)\s*['"`]?\s*,?\s*$/i

/** Tailwind type-size utilities — the scale must not be set in markup. */
const TAILWIND_TEXT_SIZE =
  /(?:^|["'\s`])text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[[^\]]*(?:rem|px|em)[^\]]*\])(?=["'\s`]|$)/g

const walk = (dir) => {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (EXTENSIONS.has(extname(full))) out.push(full)
  }
  return out
}

const violations = []

for (const dir of SEARCH_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file)
    if (rel === TOKEN_FILE) continue

    const source = readFileSync(file, 'utf8')
    const lines = source.split(/\r?\n/)

    lines.forEach((line, index) => {
      for (const pattern of [CSS_FONT_SIZE, JSX_FONT_SIZE]) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(line)) !== null) {
          if (!ALLOWED_VALUE.test(match[1])) {
            violations.push(`${rel}:${index + 1}  ${match[0].trim()}`)
          }
        }
      }

      TAILWIND_TEXT_SIZE.lastIndex = 0
      const utility = TAILWIND_TEXT_SIZE.exec(line)
      if (utility) {
        violations.push(`${rel}:${index + 1}  ${utility[0].trim()}`)
      }
    })
  }
}

if (violations.length > 0) {
  console.error(
    `\nType-scale check FAILED — ${violations.length} declaration(s) outside ${TOKEN_FILE}:\n`,
  )
  for (const violation of violations) console.error(`  ${violation}`)
  console.error(
    '\nUse var(--text-display), var(--text-small) or var(--text-micro),\n' +
      'or the .t-display / .t-small / .t-micro classes. Build spec §4.\n',
  )
  process.exit(1)
}

console.log('Type-scale check passed — one source of truth for font sizes.')
