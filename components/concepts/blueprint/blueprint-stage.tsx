'use client'

import Link from 'next/link'
import { useRef } from 'react'

import BlueprintCanvas from './blueprint-canvas'
import styles from './blueprint.module.css'

/**
 * Holds the camera-anchored type. The title, the note and the document
 * reference all live at fixed WORLD coordinates and are moved by the same
 * camera as the sketches — so they are part of the drawing, not an overlay
 * floating above it.
 */
export function BlueprintStage() {
  const worldRef = useRef<HTMLDivElement>(null)

  return (
    <BlueprintCanvas worldRef={worldRef}>
      <div ref={worldRef} className={styles.world}>
        <p className={`${styles.title} t-micro`}>Yale Entrepreneurial Society</p>

        <p className={styles.note}>build something →</p>

        <p className={`${styles.docref} t-micro`}>
          <Link href="/manifesto">DOC. 001 — MANIFESTO</Link>
        </p>
      </div>
    </BlueprintCanvas>
  )
}
