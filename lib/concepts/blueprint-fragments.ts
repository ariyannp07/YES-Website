import { createRandom } from '@/lib/seeded-random'

/**
 * CONCEPT 2 — THE INFINITE BLUEPRINT. Fragment library.
 *
 * Every drawing is generated from its own seed, so the wall is identical every
 * load, is never the same fragment twice, and costs nothing to store. Nothing
 * here is clip art: each kind is a small procedural sketch of the sort of thing
 * a student project actually leaves behind — a gear study, a trace layout, a
 * plot being re-fitted, a massing model, a UI frame, an idea crossed out.
 *
 * Drawing happens in fragment-local coordinates with the origin at its top-left;
 * the canvas transform places it in the world.
 */

export const FRAGMENT_KINDS = [
  'gear',
  'circuit',
  'graph',
  'massing',
  'code',
  'uiframe',
  'equation',
  'annotation',
  'crossed',
  'silhouette',
  'lattice',
  'orbit',
  'dimension',
  'exploded',
] as const

export type FragmentKind = (typeof FRAGMENT_KINDS)[number]

export interface Fragment {
  readonly kind: FragmentKind
  /** World coordinates, top-left. */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** 0 far, 1 mid, 2 near. Drives parallax, line weight and opacity. */
  readonly layer: 0 | 1 | 2
  readonly seed: number
  /** Rendered in saturated Yale blue rather than the ghost-line palette. */
  readonly bold: boolean
  /** Seconds into the loop at which this fragment animates. */
  readonly animateAt: number
}

export const WORLD = { w: 4400, h: 3000 } as const

/** How long one fragment's animation runs, and how often the loop comes round. */
export const ANIM_DURATION = 3.4
export const ANIM_CYCLE = 26

const FRAGMENT_SEED = 8821
const FRAGMENT_COUNT = 420

/** The title lives here, and fragments keep out of it. */
export const TITLE_WORLD = { x: 1980, y: 1430 } as const
const TITLE_ZONE = {
  x: TITLE_WORLD.x - 120,
  y: TITLE_WORLD.y - 140,
  w: 1080,
  h: 620,
}

const overlapsTitle = (x: number, y: number, w: number, h: number): boolean =>
  x < TITLE_ZONE.x + TITLE_ZONE.w &&
  x + w > TITLE_ZONE.x &&
  y < TITLE_ZONE.y + TITLE_ZONE.h &&
  y + h > TITLE_ZONE.y

export const buildFragments = (): readonly Fragment[] => {
  const random = createRandom(FRAGMENT_SEED)
  const fragments: Fragment[] = []
  let guard = 0

  while (fragments.length < FRAGMENT_COUNT && guard < 40000) {
    guard += 1

    const kind = FRAGMENT_KINDS[Math.floor(random() * FRAGMENT_KINDS.length)]
    const layer = (random() < 0.42 ? 0 : random() < 0.72 ? 1 : 2) as 0 | 1 | 2
    const scale = layer === 0 ? 0.75 : layer === 1 ? 1 : 1.3

    const w = (150 + random() * 260) * scale
    const h = (110 + random() * 220) * scale
    const x = random() * (WORLD.w - w)
    const y = random() * (WORLD.h - h)

    if (overlapsTitle(x, y, w, h)) continue

    fragments.push({
      kind,
      x,
      y,
      w,
      h,
      layer,
      seed: Math.floor(random() * 1e9),
      bold: random() < 0.12,
      animateAt: random() * ANIM_CYCLE,
    })
  }

  return fragments
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

type Ctx = CanvasRenderingContext2D

/** Plausible fragments of student work — not runnable, and not meant to be. */
const CODE_LINES = [
  'for step in range(n):',
  '  loss = f(x) - y',
  '  w -= lr * grad(loss)',
  'if delta < tol: break',
  'return solve(A, b)',
  'const t = clamp(u, 0, 1)',
  'assert stable(sys)',
  'yield batch[i : i + k]',
  'q = normalize(q)',
  'emit(frame, dt)',
]

const EQUATIONS = [
  'F = ma',
  '∇·E = ρ/ε₀',
  'dS/dt ≥ 0',
  'y = σ(Wx + b)',
  'PV = nRT',
  'E[X] = Σ xᵢpᵢ',
  'λ = h/p',
  'Δv = vₑ ln(m₀/m₁)',
]

/**
 * Annotations in the hand of whoever was at the wall. Deliberately mundane —
 * a real working note, not a slogan.
 */
const NOTES = [
  'why not both?',
  'ask the biologists',
  'cheaper if we cast it',
  'this breaks at scale',
  'v3 — actually works',
  'measure first',
  'talk to a founder',
  'rebuild the mount',
  'too slow. rewrite.',
  'she solved this in 2024',
]

const path = (ctx: Ctx, points: readonly (readonly [number, number])[]): void => {
  ctx.beginPath()
  points.forEach(([px, py], index) => {
    if (index === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
}

const arrow = (ctx: Ctx, x1: number, y1: number, x2: number, y2: number): void => {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - Math.cos(angle - 0.4) * 8, y2 - Math.sin(angle - 0.4) * 8)
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - Math.cos(angle + 0.4) * 8, y2 - Math.sin(angle + 0.4) * 8)
  ctx.stroke()
}

/**
 * Draw one fragment. `t` is null when the fragment is at rest, or 0..1 while it
 * is running its animation.
 */
export const drawFragment = (
  ctx: Ctx,
  fragment: Fragment,
  t: number | null,
): void => {
  const random = createRandom(fragment.seed)
  const { w, h } = fragment
  const progress = t ?? 1

  switch (fragment.kind) {
    case 'gear': {
      const radius = Math.min(w, h) * 0.42
      const teeth = 10 + Math.floor(random() * 10)
      const spin = t === null ? 0 : t * 0.6

      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(spin)
      ctx.beginPath()
      for (let i = 0; i < teeth * 2; i += 1) {
        const r = i % 2 === 0 ? radius : radius * 0.86
        const a = (i / (teeth * 2)) * Math.PI * 2
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Centre lines run past the part, the way a drawing marks an axis.
      ctx.beginPath()
      ctx.moveTo(w / 2 - radius * 1.25, h / 2)
      ctx.lineTo(w / 2 + radius * 1.25, h / 2)
      ctx.moveTo(w / 2, h / 2 - radius * 1.25)
      ctx.lineTo(w / 2, h / 2 + radius * 1.25)
      ctx.stroke()
      break
    }

    case 'circuit': {
      const rows = 4 + Math.floor(random() * 3)
      for (let i = 0; i < rows; i += 1) {
        const y = (h / (rows + 1)) * (i + 1)
        const mid = w * (0.3 + random() * 0.4)
        const drop = y + (random() - 0.5) * h * 0.3
        path(ctx, [
          [0, y],
          [mid, y],
          [mid, drop],
          [w, drop],
        ])
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(mid, y, 2.6, 0, Math.PI * 2)
        ctx.stroke()
      }
      const px = w * 0.45
      const py = h * 0.2
      ctx.strokeRect(px, py, w * 0.22, h * 0.14)
      break
    }

    case 'graph': {
      ctx.beginPath()
      ctx.moveTo(0, h)
      ctx.lineTo(w, h)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, h)
      ctx.stroke()

      // On animation the curve re-fits: the exponent eases to a new value.
      const exponent = 1.1 + (t === null ? 0.6 : 0.6 + Math.sin(progress * Math.PI) * 0.9)
      const points: [number, number][] = []
      for (let i = 0; i <= 28; i += 1) {
        const u = i / 28
        points.push([u * w, h - Math.pow(u, exponent) * h * 0.92])
      }
      path(ctx, points)
      ctx.stroke()

      // Scatter the observations the curve is fitted to.
      const scatterRandom = createRandom(fragment.seed + 7)
      for (let i = 0; i < 9; i += 1) {
        const u = scatterRandom()
        const px = u * w
        const py = h - Math.pow(u, exponent) * h * 0.92 + (scatterRandom() - 0.5) * h * 0.16
        ctx.beginPath()
        ctx.arc(px, py, 1.8, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }

    case 'massing': {
      // A wireframe block that extrudes upward while it animates.
      const depth = w * 0.22
      const rise = t === null ? h * 0.55 : h * 0.55 * (0.25 + 0.75 * Math.sin(progress * Math.PI))
      const baseY = h * 0.85
      const left = w * 0.16
      const right = w * 0.72

      path(ctx, [
        [left, baseY],
        [right, baseY],
        [right + depth, baseY - depth * 0.6],
        [left + depth, baseY - depth * 0.6],
        [left, baseY],
      ])
      ctx.stroke()

      path(ctx, [
        [left, baseY - rise],
        [right, baseY - rise],
        [right + depth, baseY - rise - depth * 0.6],
        [left + depth, baseY - rise - depth * 0.6],
        [left, baseY - rise],
      ])
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(left, baseY)
      ctx.lineTo(left, baseY - rise)
      ctx.moveTo(right, baseY)
      ctx.lineTo(right, baseY - rise)
      ctx.moveTo(right + depth, baseY - depth * 0.6)
      ctx.lineTo(right + depth, baseY - rise - depth * 0.6)
      ctx.stroke()
      break
    }

    case 'code': {
      const count = 4 + Math.floor(random() * 3)
      ctx.font = '11px ui-monospace, monospace'
      for (let i = 0; i < count; i += 1) {
        const line = CODE_LINES[Math.floor(random() * CODE_LINES.length)]
        // The animating fragment rewrites one line, character by character.
        const rewriting = t !== null && i === count - 2
        const shown = rewriting
          ? line.slice(0, Math.floor(line.length * Math.min(1, progress * 1.6)))
          : line
        ctx.fillText(shown, 0, 14 + i * 16)
        if (rewriting && progress < 0.95) {
          const cw = ctx.measureText(shown).width
          ctx.fillRect(cw + 1, 5 + i * 16, 5, 11)
        }
      }
      break
    }

    case 'uiframe': {
      ctx.strokeRect(0, 0, w, h)
      ctx.beginPath()
      ctx.moveTo(0, 18)
      ctx.lineTo(w, 18)
      ctx.stroke()
      const rows = 3 + Math.floor(random() * 3)
      for (let i = 0; i < rows; i += 1) {
        const y = 32 + i * 16
        if (y > h - 8) break
        ctx.beginPath()
        ctx.moveTo(10, y)
        ctx.lineTo(10 + (w - 30) * (0.4 + random() * 0.55), y)
        ctx.stroke()
      }
      break
    }

    case 'equation': {
      ctx.font = 'italic 20px Georgia, serif'
      ctx.fillText(EQUATIONS[Math.floor(random() * EQUATIONS.length)], 0, h * 0.5)
      break
    }

    case 'annotation': {
      ctx.font = 'italic 15px Georgia, serif'
      const note = NOTES[Math.floor(random() * NOTES.length)]
      ctx.fillText(note, 0, 14)
      arrow(ctx, 4, 22, w * 0.55, h * 0.75)
      break
    }

    case 'crossed': {
      ctx.strokeRect(0, 0, w * 0.8, h * 0.62)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(w * 0.8, h * 0.62)
      ctx.moveTo(w * 0.8, 0)
      ctx.lineTo(0, h * 0.62)
      ctx.stroke()
      ctx.font = 'italic 13px Georgia, serif'
      ctx.fillText('no', w * 0.84, h * 0.34)
      break
    }

    case 'silhouette': {
      // A moulded part, drawn as a closed organic outline with a datum line.
      const points: [number, number][] = []
      const lobes = 7 + Math.floor(random() * 4)
      for (let i = 0; i <= lobes; i += 1) {
        const a = (i / lobes) * Math.PI * 2
        const r = (0.3 + random() * 0.16) * Math.min(w, h)
        points.push([w / 2 + Math.cos(a) * r * 1.3, h / 2 + Math.sin(a) * r])
      }
      path(ctx, points)
      ctx.closePath()
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
      break
    }

    case 'lattice': {
      const count = 6 + Math.floor(random() * 5)
      const sites: [number, number][] = []
      for (let i = 0; i < count; i += 1) {
        sites.push([random() * w, random() * h])
      }
      sites.forEach(([px, py], i) => {
        ctx.beginPath()
        ctx.arc(px, py, 3.2, 0, Math.PI * 2)
        ctx.stroke()
        const [qx, qy] = sites[(i + 1) % sites.length]
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(qx, qy)
        ctx.stroke()
      })
      break
    }

    case 'orbit': {
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(random() * Math.PI)
      for (let i = 1; i <= 3; i += 1) {
        ctx.beginPath()
        ctx.ellipse(0, 0, (w / 2) * (i / 3), (h / 3.4) * (i / 3), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      const a = progress * Math.PI * 2
      ctx.beginPath()
      ctx.arc(Math.cos(a) * (w / 2) * 0.66, Math.sin(a) * (h / 3.4) * 0.66, 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      break
    }

    case 'dimension': {
      const y = h * 0.5
      ctx.beginPath()
      ctx.moveTo(0, y - 8)
      ctx.lineTo(0, y + 8)
      ctx.moveTo(w, y - 8)
      ctx.lineTo(w, y + 8)
      ctx.stroke()
      arrow(ctx, 0, y, w * 0.42, y)
      arrow(ctx, w, y, w * 0.58, y)
      ctx.font = '10px ui-monospace, monospace'
      ctx.fillText(`${Math.round(w)}.0`, w * 0.44, y - 6)
      break
    }

    case 'exploded': {
      const parts = 3 + Math.floor(random() * 2)
      const spread = t === null ? 1 : 0.35 + 0.65 * Math.sin(progress * Math.PI)
      for (let i = 0; i < parts; i += 1) {
        const y = i * (h / parts) * spread
        ctx.strokeRect(w * 0.15, y, w * 0.6, h / (parts * 2.4))
        if (i > 0) {
          ctx.beginPath()
          ctx.setLineDash([3, 4])
          ctx.moveTo(w * 0.45, y)
          ctx.lineTo(w * 0.45, y - (h / parts) * spread * 0.6)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      break
    }
  }
}
