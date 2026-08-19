import type { Metadata } from 'next'
import Link from 'next/link'

import { ConceptChrome } from '@/components/concepts/concept-chrome'
import SignalCanvas from '@/components/concepts/signal/signal-canvas'
import styles from '@/components/concepts/signal/signal.module.css'

export const metadata: Metadata = {
  title: 'Signal — YES prototype',
}

/**
 * CONCEPT 1 — THE SIGNAL.
 *
 * Opens on one pulsing point in near-black. The cursor scans a hidden network
 * into view; over ~10 seconds it densifies on its own, and because half the
 * nodes are sampled from inside the YES mark, the shape surfaces as a density
 * rather than as a logo. Disciplines occasionally collide and propose something
 * neither of them would have alone.
 */
export default function SignalConcept() {
  return (
    <>
      <SignalCanvas />

      <div className={styles.copy}>
        <p className={`${styles.name} t-micro`}>Yale Entrepreneurial Society</p>
        <p className={`${styles.tagline} t-micro`}>For people who build.</p>
        <p className={`${styles.enter} t-micro`}>
          <Link href="/manifesto">Manifesto</Link>
        </p>
      </div>

      <ConceptChrome current="signal" />
    </>
  )
}
