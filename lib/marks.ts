import { z } from 'zod'

import { GLYPH_SHAPES } from '@/components/field/glyph'
import approved from '@/content/marks/approved.json'
import { between, betweenRounded, createRandom } from '@/lib/seeded-random'

/**
 * The landing field's marks, and the permission gate that governs them.
 *
 * Build spec §1: "every logo shown requires written permission from the company
 * … No logo ships without sign-off." That rule is enforced here rather than
 * trusted to a reviewer: a `logo` mark without both `approvedBy` and
 * `approvedOn` is dropped from the field and reported in the build log.
 */

const GlyphMark = z.object({
  id: z.string().min(1),
  kind: z.literal('glyph'),
  shape: z.enum(GLYPH_SHAPES),
})

const LogoMark = z.object({
  id: z.string().min(1),
  kind: z.literal('logo'),
  /** Path under /public. Monochrome SVG — recoloured to --field-mark. */
  src: z.string().min(1),
  /** Who at the company gave permission. Required for the mark to render. */
  approvedBy: z.string().min(1).optional(),
  /** ISO date the permission was given. Required for the mark to render. */
  approvedOn: z.string().min(1).optional(),
})

const Mark = z.discriminatedUnion('kind', [GlyphMark, LogoMark])
const MarksFile = z.object({ marks: z.array(Mark) })

export type Mark = z.infer<typeof Mark>

/** A mark with its resolved position in the field. */
export interface PlacedMark {
  readonly mark: Mark
  readonly leftPct: number
  readonly topPct: number
  readonly scale: number
  readonly opacity: number
  readonly driftXvw: number
  readonly driftYvh: number
  readonly durationSec: number
  readonly delaySec: number
}

const FIELD_SEED = 20260815

/** Marks stay off the extreme edges so nothing clips on narrow viewports. */
const BOUNDS = { minX: 3, maxX: 95, minY: 5, maxY: 93 } as const

interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/**
 * Regions the field must leave alone: the wordmark and its link own the middle,
 * and the three corner texts (clock, founded line, preview palette switcher)
 * own their corners. A mark drifting through the wordmark reads as a bug.
 */
const RESERVED: readonly Rect[] = [
  { x: 17, y: 20, w: 66, h: 52 }, // spinning mark + wordmark + landing link
  { x: 0, y: 2, w: 27, h: 12 }, // live clock, top left
  { x: 0, y: 84, w: 25, h: 13 }, // "Building since 1999", bottom left
  { x: 85, y: 87, w: 15, h: 13 }, // preview palette switcher, bottom right
]

const MAX_PLACEMENT_ATTEMPTS = 240

/** Clearance kept between two marks, in viewport percent. */
const MARK_GAP = { x: 1.8, y: 2.4 } as const

/** Reference viewport used to turn estimated pixel sizes into percentages. */
const REFERENCE_VIEWPORT_W = 1280
const REFERENCE_VIEWPORT_H = 800
const REFERENCE_DISPLAY_PX = 56

/** Glyphs are square. Logo lockups are wider than they are tall. */
const aspectOf = (mark: Mark): number => (mark.kind === 'glyph' ? 1 : 2.4)

const scaleRangeFor = (mark: Mark): readonly [number, number] =>
  mark.kind === 'glyph' ? [0.62, 1.85] : [0.55, 1.15]

const sizeOf = (mark: Mark, scale: number): { w: number; h: number } => {
  const heightPx = REFERENCE_DISPLAY_PX * scale
  return {
    w: ((heightPx * aspectOf(mark)) / REFERENCE_VIEWPORT_W) * 100,
    h: (heightPx / REFERENCE_VIEWPORT_H) * 100,
  }
}

const overlapArea = (a: Rect, b: Rect): number => {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return width > 0 && height > 0 ? width * height : 0
}

/**
 * Covering the wordmark is far worse than brushing another mark, so reserved
 * regions are weighted an order of magnitude heavier when scoring a candidate.
 */
const RESERVED_PENALTY = 12

const grow = (rect: Rect, x: number, y: number): Rect => ({
  x: rect.x - x,
  y: rect.y - y,
  w: rect.w + x * 2,
  h: rect.h + y * 2,
})

const isApproved = (mark: Mark): boolean =>
  mark.kind === 'glyph' || Boolean(mark.approvedBy && mark.approvedOn)

/**
 * Marks cleared to render. Glyphs always pass; logos pass only with written
 * sign-off recorded in content/marks/approved.json.
 */
export const approvedMarks = (): readonly Mark[] => {
  const parsed = MarksFile.safeParse(approved)

  if (!parsed.success) {
    // A malformed allowlist must not silently empty the landing page.
    throw new Error(
      `content/marks/approved.json is invalid: ${parsed.error.message}`,
    )
  }

  const permitted = parsed.data.marks.filter(isApproved)
  const withheld = parsed.data.marks.length - permitted.length

  if (withheld > 0) {
    console.warn(
      `[marks] ${withheld} logo mark(s) withheld — missing approvedBy/approvedOn. ` +
        'Build spec §1: no logo ships without sign-off.',
    )
  }

  return permitted
}

/**
 * Lay the field out from a fixed seed, so the server and the browser agree.
 *
 * Each mark is tested as a *swept* rectangle — its resting box grown by its own
 * drift amplitude — against the reserved regions and every mark already placed.
 * Testing the whole travel rather than the resting position is what keeps a
 * mark from wandering through the wordmark thirty seconds after load.
 *
 * Returns a new array; nothing here mutates its input.
 */
export const placeMarks = (marks: readonly Mark[]): readonly PlacedMark[] => {
  const random = createRandom(FIELD_SEED)
  const placed: PlacedMark[] = []
  const taken: Rect[] = []

  for (const mark of marks) {
    const [minScale, maxScale] = scaleRangeFor(mark)
    const scale = betweenRounded(random, minScale, maxScale)
    const { w: width, h: height } = sizeOf(mark, scale)

    // Long cycles, small amplitude. Drift, not bounce.
    const driftXvw = betweenRounded(random, 1.1, 3)
    const driftYvh = betweenRounded(random, 0.9, 2.4)

    const rightLimit = Math.max(BOUNDS.minX + 1, BOUNDS.maxX - width)
    const bottomLimit = Math.max(BOUNDS.minY + 1, BOUNDS.maxY - height)

    let x: number = BOUNDS.minX
    let y: number = BOUNDS.minY
    let bestPenalty = Number.POSITIVE_INFINITY

    // Score every candidate and keep the least-bad one. A crowded field then
    // degrades to the smallest possible overlap instead of to whatever the
    // last random draw happened to be — which is how a mark ends up sitting on
    // the wordmark.
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const candidateX = betweenRounded(random, BOUNDS.minX, rightLimit)
      const candidateY = betweenRounded(random, BOUNDS.minY, bottomLimit)

      const swept = grow(
        { x: candidateX, y: candidateY, w: width, h: height },
        driftXvw,
        driftYvh,
      )
      const spaced = grow(swept, MARK_GAP.x, MARK_GAP.y)

      const penalty =
        RESERVED.reduce(
          (total, region) => total + overlapArea(swept, region) * RESERVED_PENALTY,
          0,
        ) + taken.reduce((total, region) => total + overlapArea(spaced, region), 0)

      if (penalty < bestPenalty) {
        bestPenalty = penalty
        x = candidateX
        y = candidateY
      }

      if (penalty === 0) break
    }

    taken.push(grow({ x, y, w: width, h: height }, driftXvw, driftYvh))

    placed.push({
      mark,
      leftPct: x,
      topPct: y,
      scale,
      // Quiet. The mark is the subject; the field is the room it sits in.
      opacity: betweenRounded(random, 0.07, 0.17),
      driftXvw,
      driftYvh,
      durationSec: Math.round(between(random, 90, 180)),
      // Negative delay starts every mark mid-path, so nothing begins in unison.
      delaySec: -Math.round(between(random, 0, 90)),
    })
  }

  return placed
}
