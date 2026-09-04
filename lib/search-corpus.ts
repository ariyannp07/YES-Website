import 'server-only'

import { directoryPeople } from '@/lib/catalog-directory'

/**
 * The retrieval corpus for semantic search.
 *
 * WHY THERE IS NO VECTOR STORE. xAI exposes no embeddings endpoint (/v1/embeddings
 * returns 404), so cosine-similarity RAG is not available on this provider. With
 * 107 short records the entire corpus is ~9k tokens, which fits in one request —
 * so retrieval happens by putting the whole directory in context rather than by
 * pretending to run a vector index. If the directory grows past a few thousand
 * people this stops being true and needs a real index behind it.
 *
 * One compact line per builder. Bios are truncated because the tail of a bio is
 * restatement, and every character here is paid for on every query.
 */

const BIO_CHARS = 150

let cached: string | null = null

export const searchCorpus = (): string => {
  if (cached !== null) return cached

  cached = directoryPeople()
    .map((person) =>
      [
        person.slug,
        person.name,
        person.classYear,
        person.directoryRole,
        person.nowLine,
        (person.sectors ?? []).join('/'),
        (person.bio ?? '').slice(0, BIO_CHARS),
      ]
        .filter(Boolean)
        .join(' | '),
    )
    .join('\n')

  return cached
}
