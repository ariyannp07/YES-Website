import type { Metadata } from 'next'
import Link from 'next/link'

import { BlueprintStage } from '@/components/blueprint/blueprint-stage'
import styles from '@/components/blueprint/blueprint.module.css'
import { SIGMA_PATH } from '@/lib/yes-geometry'

export const metadata: Metadata = {
  title: 'Audere',
}

/**
 * AUDERE — the inner cohort.
 *
 * The working wall, held as one view. The drift, the cursor parallax and the
 * fragment animations all stay; the journey across the drawing does not — this
 * page is a threshold, not a tour, so it does not scroll.
 *
 * The only way on is the note drawn into the wall.
 */
export default function AuderePage() {
  return (
    <>
      <BlueprintStage
        title="Audere"
        subtitle="A community of our very best."
        note="dare to build the future, join us →"
        href="/audere/apply"
        scrollDriven={false}
      />

      <Link href="/" className={`${styles.stamp} t-micro`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {/* Imported, not transcribed — the mark has one definition, so
              replacing the placeholder geometry updates every surface. */}
          <path d={SIGMA_PATH} fill="currentColor" />
        </svg>
        <span>YES</span>
      </Link>
    </>
  )
}
