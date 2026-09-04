import type { Metadata } from 'next'

import { CatalogExperience } from '@/components/catalog/catalog-experience'
import embeddings from '@/content/catalog/embeddings.json'
import { allAlumni } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'People',
}

/**
 * The People directory.
 *
 * `force-static` guarantees the consent-gated feed is read at BUILD time only,
 * so a newly consented person appears when a human deploys — never on a timer.
 * Canon 05-human-ai-policy R1.
 *
 * The data is resolved here on the server and shipped as props. Profiles with
 * available portraits lead the initial browse order; semantic search still runs
 * in the browser against vectors baked by `npm run embed`.
 */
export const dynamic = 'force-static'

export default async function CatalogPage() {
  const people = [...(await allAlumni())].sort(
    (left, right) => {
      const statusOrder =
        Number(left.directoryStatus === 'uncertain') -
        Number(right.directoryStatus === 'uncertain')
      if (statusOrder !== 0) return statusOrder

      return Number(Boolean(right.portraitColor)) - Number(Boolean(left.portraitColor))
    },
  )
  const storedVectors = embeddings.vectors as Record<string, number[]>
  const publicVectors = Object.fromEntries(
    people.flatMap((person) => {
      const vector = storedVectors[person.slug]
      return vector ? [[person.slug, vector]] : []
    }),
  )

  return <CatalogExperience people={people} vectors={publicVectors} />
}
