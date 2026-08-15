import type { CSSProperties } from 'react'

import {
  DEPTH_PX,
  EDGES,
  NODES,
  SCENE_PX,
  SIGMA_PATH,
} from '@/lib/yes-geometry'

import styles from './spinning-mark.module.css'

/**
 * The floating YES mark.
 *
 * Two things make one object rather than two pictures of one:
 *
 *   1. The body is a stack of silhouettes on the Z axis, each translucent, so
 *      they accumulate into a solid with a dense core and glassy edges. None of
 *      them is mirrored — an extruded solid seen from behind IS reversed, and
 *      "correcting" the back face is what previously made the middle read as
 *      an X.
 *   2. The network is genuine 3D geometry, not paint on the faces. Nodes sit at
 *      real depths inside and just beyond the body, edges are segments aimed in
 *      space, so the white lines run continuously front to back and stay
 *      consistent from every angle.
 *
 * All of it is CSS. Nothing here ships JavaScript to the browser.
 */

const SLAB_COUNT = 40

/** Front-to-back shading of the body. */
const FACE_LIGHT = { r: 0x3a, g: 0x7a, b: 0xd4 }
const FACE_DARK = { r: 0x06, g: 0x14, b: 0x2c }

const shadeAt = (t: number): string => {
  const eased = t ** 0.6
  const mix = (a: number, b: number) => Math.round(a + (b - a) * eased)
  return `rgb(${mix(FACE_LIGHT.r, FACE_DARK.r)} ${mix(FACE_LIGHT.g, FACE_DARK.g)} ${mix(FACE_LIGHT.b, FACE_DARK.b)})`
}

export function SpinningMark({ durationSec = 34 }: { readonly durationSec?: number }) {
  const half = DEPTH_PX / 2
  const step = DEPTH_PX / (SLAB_COUNT - 1)

  return (
    <div
      className={styles.stage}
      style={
        {
          '--scene': `${SCENE_PX}px`,
          '--u': 1,
          '--mark-duration': `${durationSec}s`,
          '--net': '#ffffff',
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className={styles.scene}>
        <div className={styles.solid}>
          {/* Body. Translucent slabs, front to back, no mirroring. */}
          {Array.from({ length: SLAB_COUNT }, (_, index) => {
            const t = index / (SLAB_COUNT - 1)
            return (
              <div
                key={`slab-${index}`}
                className={styles.slab}
                style={{ '--z': `${half - index * step}px` } as CSSProperties}
              >
                <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                  <path d={SIGMA_PATH} fill={shadeAt(t)} fillOpacity={0.16} />
                </svg>
              </div>
            )
          })}

          {/* Network edges, aimed in 3D. */}
          {EDGES.map((edge, index) => (
            <div
              key={`edge-${index}`}
              className={styles.edge}
              style={
                {
                  '--x': `${edge.x}px`,
                  '--y': `${edge.y}px`,
                  '--z': `${edge.z}px`,
                  '--len': `${edge.length}px`,
                  '--yaw': `${edge.yaw}deg`,
                  '--pitch': `${edge.pitch}deg`,
                  '--o': edge.opacity,
                  '--tw-dur': `${edge.durationSec}s`,
                  '--tw-delay': `${edge.delaySec}s`,
                } as CSSProperties
              }
            />
          ))}

          {/* Network nodes. */}
          {NODES.map((node, index) => (
            <div
              key={`node-${index}`}
              className={styles.node}
              style={
                {
                  '--x': `${node.x}px`,
                  '--y': `${node.y}px`,
                  '--z': `${node.z}px`,
                  '--d': `${node.size}px`,
                  '--tw-dur': `${node.durationSec}s`,
                  '--tw-delay': `${node.delaySec}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
