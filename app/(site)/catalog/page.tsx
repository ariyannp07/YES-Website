import type { Metadata } from 'next'

import { Mosaic } from '@/components/alumni/mosaic'
import { allAlumni, alumniFeedConfigured } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Catalog',
}

/**
 * The catalog wall (build spec §3, the alumni page). No page header beyond the
 * nav, no names at rest, no captions, no cohort groupings. The wall of
 * unlabeled faces IS the mystery.
 *
 * `force-static` guarantees the consent-gated feed is read at BUILD time only,
 * so a newly consented person appears when a human deploys — never on a timer.
 * Canon 05-human-ai-policy R1.
 */
export const dynamic = 'force-static'

export default async function CatalogPage() {
  const people = await allAlumni()
  const connected = alumniFeedConfigured()

  return (
    <div className="page-top">
      <Mosaic people={people} />

      {connected ? null : (
        <p
          className="t-micro"
          style={{
            color: 'var(--muted)',
            marginTop: '4rem',
            textAlign: 'center',
          }}
        >
          [ Placeholder silhouettes. Real dossiers appear only from the
          consent-gated Alumni-Page-Feed. ]
        </p>
      )}
    </div>
  )
}
