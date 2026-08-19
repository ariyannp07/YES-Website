import type { Metadata } from 'next'

import { ConceptChrome } from '@/components/concepts/concept-chrome'
import { PortalStage } from '@/components/concepts/portal/portal-stage'
import styles from '@/components/concepts/portal/portal.module.css'

export const metadata: Metadata = {
  title: 'Portal — YES prototype',
}

/**
 * CONCEPT 3 — THE PORTAL.
 *
 * A slit of cobalt in near-black that parts to reveal an architectural space
 * behind the page. Scroll carries the camera through the opening; the cursor
 * shifts the perspective. The way in stays hidden until you look for it.
 */
export default function PortalConcept() {
  return (
    <>
      <PortalStage />

      {/* Gives the wheel something to drive. The canvas never scrolls. */}
      <div className={styles.scroll} aria-hidden="true" />

      <ConceptChrome current="portal" />
    </>
  )
}
