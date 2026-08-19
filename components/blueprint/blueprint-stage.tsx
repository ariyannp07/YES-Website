'use client'

import Link from 'next/link'
import { useRef } from 'react'

import BlueprintCanvas from './blueprint-canvas'
import styles from './blueprint.module.css'

/**
 * The working wall, with its type anchored in the drawing.
 *
 * The title and the note live at fixed WORLD coordinates and are moved by the
 * same camera as the sketches, so they read as drawn onto the wall rather than
 * as an overlay floating above it.
 *
 * `scrollDriven` is the difference between the two places this is used: the
 * landing prototype travels across the wall as you scroll, while Spectre holds
 * one framing and only breathes — the drift and the cursor parallax stay, the
 * journey does not.
 */
export function BlueprintStage({
  title,
  note,
  href,
  scrollDriven = true,
}: {
  readonly title: string
  readonly note: string
  readonly href: string
  readonly scrollDriven?: boolean
}) {
  const worldRef = useRef<HTMLDivElement>(null)

  return (
    <BlueprintCanvas worldRef={worldRef} scrollDriven={scrollDriven}>
      <div ref={worldRef} className={styles.world}>
        <p className={`${styles.title} t-micro`}>{title}</p>

        <p className={styles.note}>
          <Link href={href}>{note}</Link>
        </p>
      </div>
    </BlueprintCanvas>
  )
}
