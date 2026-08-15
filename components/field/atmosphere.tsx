import type { CSSProperties } from 'react'

import { between, betweenRounded, createRandom } from '@/lib/seeded-random'

import styles from './atmosphere.module.css'

/**
 * The void, given depth.
 *
 * A vignette plus a slow dust of points. The dust is deliberately below the
 * threshold of "an element you look at" — it registers as air in the room, not
 * as content. Anything more legible than this starts explaining itself, and the
 * front door's whole argument is that it does not.
 *
 * Server component; all motion is CSS.
 */

const DUST_SEED = 550919
const DUST_COUNT = 70

/** The middle belongs to the mark and the wordmark. Dust thins out there. */
const CENTER = { x: 50, y: 47, radius: 24 }

interface Mote {
  readonly leftPct: number
  readonly topPct: number
  readonly sizePx: number
  readonly opacity: number
  readonly driftXvw: number
  readonly driftYvh: number
  readonly durationSec: number
  readonly delaySec: number
}

const buildDust = (): readonly Mote[] => {
  const random = createRandom(DUST_SEED)
  const motes: Mote[] = []

  while (motes.length < DUST_COUNT) {
    const leftPct = betweenRounded(random, 1, 99)
    const topPct = betweenRounded(random, 2, 97)

    const distance = Math.hypot(leftPct - CENTER.x, topPct - CENTER.y)
    // Thin rather than forbid: a few motes near the middle keep the field from
    // looking like it has a hole cut in it.
    if (distance < CENTER.radius && random() > 0.18) continue

    motes.push({
      leftPct,
      topPct,
      sizePx: betweenRounded(random, 1, 2.4, 1),
      opacity: betweenRounded(random, 0.05, 0.22),
      driftXvw: betweenRounded(random, 0.6, 2.4),
      driftYvh: betweenRounded(random, 0.5, 2),
      durationSec: Math.round(between(random, 70, 160)),
      delaySec: -Math.round(between(random, 0, 120)),
    })
  }

  return motes
}

const DUST = buildDust()

export function Atmosphere() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.wash} />

      {DUST.map((mote, index) => (
        <span
          key={index}
          className={styles.dust}
          style={
            {
              '--x': `${mote.leftPct}%`,
              '--y': `${mote.topPct}%`,
              '--d': `${mote.sizePx}px`,
              '--o': mote.opacity,
              '--dx': `${mote.driftXvw}vw`,
              '--dy': `${mote.driftYvh}vh`,
              '--duration': `${mote.durationSec}s`,
              '--delay': `${mote.delaySec}s`,
            } as CSSProperties
          }
        />
      ))}
      <div className={styles.vignette} />
    </div>
  )
}
