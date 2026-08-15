import type { CSSProperties } from 'react'

import { Glyph } from '@/components/field/glyph'
import { approvedMarks, placeMarks, type PlacedMark } from '@/lib/marks'

import styles from './field.module.css'

/**
 * The landing signature: the marks of what Yalies have built, drifting slowly,
 * unlabeled, in a single foreground colour at low opacity so the field reads as
 * one texture rather than a sponsor wall (build spec §1).
 *
 * No captions, no "our portfolio" header, no grid. If you know, you know; if
 * you don't, you're curious — which is the entire recruiting thesis. Nothing on
 * this page explains itself.
 *
 * Server component. It renders no client JavaScript: all motion is CSS, all
 * positions come from a fixed seed in lib/marks.ts.
 */

const markStyle = (placed: PlacedMark): CSSProperties =>
  ({
    '--x': `${placed.leftPct}%`,
    '--y': `${placed.topPct}%`,
    '--scale': placed.scale,
    '--opacity': placed.opacity,
    '--dx': `${placed.driftXvw}vw`,
    '--dy': `${placed.driftYvh}vh`,
    '--duration': `${placed.durationSec}s`,
    '--delay': `${placed.delaySec}s`,
  }) as CSSProperties

export function FloatingField({
  variant = 'full',
  limit,
}: {
  /** 'echo' is the sparse, motionless variant allowed beside /work's proof. */
  readonly variant?: 'full' | 'echo'
  readonly limit?: number
}) {
  const marks = approvedMarks()
  const selected = typeof limit === 'number' ? marks.slice(0, limit) : marks
  const placed = placeMarks(selected)

  return (
    <div
      className={variant === 'echo' ? styles.echo : styles.field}
      aria-hidden="true"
    >
      {placed.map((item) => (
        <div key={item.mark.id} className={styles.mark} style={markStyle(item)}>
          <span className={styles.inner}>
            {item.mark.kind === 'glyph' ? (
              <Glyph shape={item.mark.shape} className={styles.glyph} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.logo} src={item.mark.src} alt="" />
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
