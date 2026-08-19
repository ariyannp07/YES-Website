import type { Metadata } from 'next'

import { ConceptChrome } from '@/components/concepts/concept-chrome'
import { BlueprintStage } from '@/components/blueprint/blueprint-stage'
import styles from '@/components/blueprint/blueprint.module.css'

export const metadata: Metadata = {
  title: 'Blueprint — YES prototype',
}

/**
 * CONCEPT 2 — THE INFINITE BLUEPRINT.
 *
 * The collective notebook: a working wall of student projects far larger than
 * the viewport. Scroll carries the camera across and into it; the cursor shifts
 * the viewing angle. The YES mark appears only as a maker's stamp in the sheet's
 * title block, bottom left.
 */
export default function BlueprintConcept() {
  return (
    <>
      <BlueprintStage title="Yale Entrepreneurial Society" note="build something →" href="/manifesto" />

      {/* Gives the wheel something to drive. The canvas never scrolls. */}
      <div className={styles.scroll} aria-hidden="true" />

      <div className={`${styles.stamp} t-micro`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path
            d="M8,10 L92,10 L92,27 L8,27 Z M8,33 L44,33 L80,50 L44,67 L8,67 L44,50 Z M8,73 L92,73 L92,90 L8,90 Z"
            fill="currentColor"
          />
        </svg>
        <span>YES · DWG 001</span>
      </div>

      <p className={`${styles.hint} t-micro`} aria-hidden="true">
        Scroll to go deeper
      </p>

      <ConceptChrome current="blueprint" />
    </>
  )
}
