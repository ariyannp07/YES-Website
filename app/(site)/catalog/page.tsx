import type { Metadata } from 'next'

import { CatalogExperience } from '@/components/catalog/catalog-experience'
import embeddings from '@/content/catalog/embeddings.json'
import { allAlumni } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Catalog',
}

/**
 * The catalog.
 *
 * `force-static` guarantees the consent-gated feed is read at BUILD time only,
 * so a newly consented person appears when a human deploys — never on a timer.
 * Canon 05-human-ai-policy R1.
 *
 * The interactive surface is a client component, but the DATA is resolved here
 * on the server and shipped as props: the wall is a fixed set of 116 people
 * known at build time, so there is nothing to fetch at runtime and no loading
 * state to design. Search runs in the browser against vectors baked by
 * `npm run embed`.
 */
export const dynamic = 'force-static'

export default async function CatalogPage() {
  const people = await allAlumni()

  return (
    <CatalogExperience
      people={people}
      vectors={embeddings.vectors as Record<string, number[]>}
    />
  )
}
