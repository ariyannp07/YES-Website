import type { CSSProperties } from 'react'

import { YesMark } from '@/components/field/yes-mark'

import styles from './spinning-mark.module.css'

/**
 * The floating YES mark: extruded, turning slowly, pausing on hover.
 *
 * Depth is built from silhouettes stacked on the Z axis. The slab COUNT is the
 * whole trick — too few and the object reads as a deck of cards with daylight
 * between them when it turns edge-on; packed under a pixel apart they fuse into
 * one solid with a lit side. Interior slabs are flat fills, so 44 of them cost
 * about as much as one.
 *
 * Built with CSS 3D rather than WebGL on purpose: build spec §6 caps the
 * landing at 50KB of JS, and a Three.js scene is several times that on the one
 * page the spec is strictest about. This ships zero JavaScript.
 */

const SLAB_COUNT = 44
const DEPTH_PX = 30

/**
 * Face shading, front to back. The mark keeps its own blues in both palettes —
 * it is a logo, not a themed element — but the extrusion falls off with depth
 * so the side reads as a lit surface rather than a flat block.
 */
const FACE_LIGHT = { r: 0x2f, g: 0x69, b: 0xbd }
const FACE_DARK = { r: 0x07, g: 0x18, b: 0x33 }

/** Ease the falloff so the lit edge sits near the front, as a real bevel would. */
const shadeAt = (t: number): string => {
  const eased = t ** 0.62
  const mix = (a: number, b: number) => Math.round(a + (b - a) * eased)
  return `rgb(${mix(FACE_LIGHT.r, FACE_DARK.r)} ${mix(FACE_LIGHT.g, FACE_DARK.g)} ${mix(FACE_LIGHT.b, FACE_DARK.b)})`
}

const layerStyle = (z: number, face: string, line: string): CSSProperties =>
  ({
    '--z': `${z}px`,
    '--mark-face': face,
    '--mark-line': line,
  }) as CSSProperties

export function SpinningMark({
  size = 'clamp(8.5rem, 19vw, 14.5rem)',
  durationSec = 32,
}: {
  readonly size?: string
  readonly durationSec?: number
}) {
  const half = DEPTH_PX / 2
  const step = DEPTH_PX / (SLAB_COUNT - 1)

  return (
    <div
      className={styles.stage}
      style={
        {
          '--mark-size': size,
          '--mark-duration': `${durationSec}s`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {/* Seats the mark in the void instead of leaving it pasted on. */}
      <div className={styles.glow} />

      <div className={styles.solid}>
        {Array.from({ length: SLAB_COUNT }, (_, index) => {
          const t = index / (SLAB_COUNT - 1)
          return (
            <div
              key={index}
              className={styles.layer}
              style={layerStyle(half - index * step, shadeAt(t), 'transparent')}
            >
              <YesMark variant="solid" />
            </div>
          )
        })}

        {/* Back face — mirrored, so the sigma reads correctly from behind. */}
        <div
          className={`${styles.layer} ${styles.back}`}
          style={layerStyle(-half - 0.4, shadeAt(0.82), '#9fb6d6')}
        >
          <YesMark variant="detail" idPrefix="yes-back" />
        </div>

        {/* Front face — the mark itself, mesh and all. */}
        <div
          className={styles.layer}
          style={layerStyle(half + 0.4, shadeAt(0), '#ffffff')}
        >
          <YesMark variant="detail" idPrefix="yes-front" />
        </div>
      </div>
    </div>
  )
}
