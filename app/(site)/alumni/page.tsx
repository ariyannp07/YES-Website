import type { Metadata } from 'next'

import { Mosaic } from '@/components/alumni/mosaic'
import { allAlumni, alumniFeedConfigured } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Alumni',
}

/**
 * The mosaic (build spec §3). No page header beyond the nav, no names at rest,
 * no captions, no cohort groupings. The wall of unlabeled faces IS the mystery.
 *
 * `force-static` guarantees the consent-gated feed is read at BUILD time only,
 * so a newly consented person appears when a human deploys — never on a timer.
 * Canon 05-human-ai-policy R1.
 */
export const dynamic = 'force-static'
export default async function AlumniPage() {
  const people = await allAlumni()
  const connected = alumniFeedConfigured()

  return (
    <div style={{ paddingTop: 'clamp(1.5rem, 5vh, 3rem)' }}>
      <Mosaic people={people} />

      {connected ? null : (
        <p
          className="t-micro"
          style={{ color: 'var(--muted)', marginTop: '2rem' }}
        >
          [ Placeholder silhouettes. Real dossiers appear only from the
          consent-gated Alumni-Page-Feed. ]
        </p>
      )}
    </div>
  )
}
