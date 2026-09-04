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

const BOARD_PRIORITY: Readonly<Record<string, number>> = {
  'ariyan-patel': 0,
  'sofia-teifeld': 1,
  'nicolas-gertler': 2,
  'kashi-tuteja': 3,
}

const STATUS_PRIORITY: Readonly<Record<string, number>> = {
  board: 0,
  member: 1,
  former: 2,
  uncertain: 3,
}

export default async function CatalogPage() {
  const people = [...(await allAlumni())].sort((left, right) => {
    const statusOrder =
      (STATUS_PRIORITY[left.directoryStatus ?? 'member'] ?? 2) -
      (STATUS_PRIORITY[right.directoryStatus ?? 'member'] ?? 2)
    if (statusOrder !== 0) return statusOrder

    if (left.directoryStatus === 'board' && right.directoryStatus === 'board') {
      const boardOrder =
        (BOARD_PRIORITY[left.slug] ?? Number.MAX_SAFE_INTEGER) -
        (BOARD_PRIORITY[right.slug] ?? Number.MAX_SAFE_INTEGER)
      if (boardOrder !== 0) return boardOrder
    }

    return Number(Boolean(right.portraitColor)) - Number(Boolean(left.portraitColor))
  })
  const storedVectors = embeddings.vectors as Record<string, number[]>
  const publicVectors = Object.fromEntries(
    people.flatMap((person) => {
      const vector = storedVectors[person.slug]
      return vector ? [[person.slug, vector]] : []
    }),
  )

  return <CatalogExperience people={people} vectors={publicVectors} />
}
