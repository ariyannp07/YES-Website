#!/usr/bin/env node
/**
 * The lock.
 *
 * While the landing page is being redesigned, the REST of the site is frozen.
 * This is the same principle as the other rails in this repo: a rule nobody can
 * enforce by remembering is not a rule. The baseline is a git tag, so "what the
 * site looked like before the prototype" is a fact rather than a memory.
 *
 *   npm run check:locked          fail if anything outside the landing changed
 *   LOCK_BASE=<ref> npm run ...   check against a different baseline
 *
 * To end the lock, delete this script and its entry in `npm run check`, or move
 * the tag forward once the new landing is accepted:
 *   git tag -f landing-lock-base
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BASE = process.env.LOCK_BASE ?? 'landing-lock-base'

/**
 * Paths the landing prototype owns outright.
 *
 * Everything here was verified to have no importer outside the front door:
 * lib/signal-model.ts is used only by the signal canvas, and components/landing
 * is landing-only by construction. Deliberately ABSENT, because other pages
 * depend on them: lib/site.ts (the nav and /builders), components/timestamp.tsx
 * (the nav), lib/yes-geometry.ts (/audere and the mark), app/layout.tsx.
 */
const ALLOW = [
  /^app\/page\.tsx$/,
  /^components\/landing\//,
  /^lib\/landing\//,
  /^lib\/signal-model\.ts$/,
  /^public\/landing\//,
]

/**
 * app/globals.css is a special case: the type-scale rail forces every font-size
 * into that one file, so the landing cannot declare its type anywhere else.
 * Rather than exempt the whole file, only the region below the sentinel may
 * move — everything above it is shared with every other page.
 */
const GLOBALS = 'app/globals.css'
const SENTINEL = 'LANDING SCOPE — the only part of this file'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' })

const baselineExists = () => {
  try {
    git('rev-parse', '--verify', `${BASE}^{commit}`)
    return true
  } catch {
    return false
  }
}

if (!baselineExists()) {
  console.error(
    `check:locked — baseline "${BASE}" does not exist.\n` +
      `Create it at the commit the lock should measure from:\n` +
      `  git tag ${BASE}\n`,
  )
  process.exit(1)
}

/** Tracked changes since the baseline, plus anything new and untracked. */
const changed = new Set(
  [
    ...git('diff', '--name-only', BASE).split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').split('\n'),
  ]
    .map((line) => line.trim())
    .filter(Boolean),
)

const violations = []

for (const file of changed) {
  if (file === GLOBALS) {
    // Compare only the frozen prefix, so landing type tokens stay possible.
    const before = git('show', `${BASE}:${GLOBALS}`)
    // Read the WORKING TREE, not the index. Reading `git show :path` compared
    // against staged content, so an unstaged edit above the sentinel — exactly
    // the thing this guard exists to catch — passed silently.
    const current = readFileSync(GLOBALS, 'utf8')
    const head = (text) => {
      const at = text.indexOf(SENTINEL)
      return at === -1 ? text : text.slice(0, at)
    }
    if (head(before) !== head(current)) {
      violations.push(`${GLOBALS} (changed ABOVE the landing sentinel)`)
    }
    continue
  }
  if (!ALLOW.some((pattern) => pattern.test(file))) violations.push(file)
}

if (violations.length > 0) {
  console.error(
    `\nLock check FAILED — ${violations.length} change(s) outside the landing page:\n`,
  )
  for (const v of violations) console.error(`  ${v}`)
  console.error(
    `\nThe site is locked except the front door while it is being redesigned.\n` +
      `The landing may change: app/page.tsx, components/landing/**, lib/landing/**,\n` +
      `lib/signal-model.ts, public/landing/**, and app/globals.css BELOW its sentinel.\n` +
      `\nIf a change outside that set is genuinely intended, say so — do not widen\n` +
      `ALLOW to make the check pass.\n`,
  )
  process.exit(1)
}

console.log(`Lock check passed — nothing outside the landing page changed since ${BASE}.`)
