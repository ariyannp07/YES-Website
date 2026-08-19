import type { Metadata } from 'next'
import Link from 'next/link'

import { BlueprintStage } from '@/components/blueprint/blueprint-stage'
import styles from '@/components/blueprint/blueprint.module.css'

export const metadata: Metadata = {
  title: 'Spectre',
}

/**
 * SPECTRE — the inner cohort.
 *
 * The working wall, held as one view. The drift, the cursor parallax and the
 * fragment animations all stay; the journey across the drawing does not — this
 * page is a threshold, not a tour, so it does not scroll.
 *
 * The only way on is the note drawn into the wall.
 */
export default function SpectrePage() {
  return (
    <>
      <BlueprintStage
        title="Spectre"
        note="build for the world, join us →"
        href="/spectre/apply"
        scrollDriven={false}
      />

      <Link href="/" className={`${styles.stamp} t-micro`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path
            d="M8,10 L92,10 L92,27 L8,27 Z M8,33 L44,33 L80,50 L44,67 L8,67 L44,50 Z M8,73 L92,73 L92,90 L8,90 Z"
            fill="currentColor"
          />
        </svg>
        <span>YES</span>
      </Link>
    </>
  )
}
