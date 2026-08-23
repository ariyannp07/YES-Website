import type { Alumnus } from '@/lib/alumni'

/**
 * Ranking for the catalog. Ported from the yes-catalog scaffold.
 *
 * The governing rule, kept from the original: ranking NEVER filters and never
 * returns an empty list. A wall of 116 builders that goes blank because someone
 * typed an unlucky word reads as "nobody here", which is both false and the
 * opposite of what the page is for. Everything is always ranked; the best
 * matches simply rise.
 */

/** Vectors are L2-normalized at bake time, so cosine is just the dot product. */
export const cosine = (a: readonly number[], b: readonly number[]): number => {
  const n = Math.min(a.length, b.length)
  let dot = 0
  for (let i = 0; i < n; i += 1) dot += a[i] * b[i]
  return dot
}

export interface Ranked {
  readonly person: Alumnus
  readonly score: number
}

export const rankBySimilarity = (
  queryVector: readonly number[],
  people: readonly Alumnus[],
  vectors: Readonly<Record<string, readonly number[]>>,
): readonly Ranked[] =>
  people
    .map((person) => ({
      person,
      score: vectors[person.slug] ? cosine(queryVector, vectors[person.slug]) : -1,
    }))
    .sort((a, b) => b.score - a.score)

/**
 * Offline fallback, used when the embedding model cannot be fetched — a slow
 * connection, a blocked CDN, or a browser without WASM. Crude, but it still
 * ranks every builder rather than leaving search dead.
 */
export const rankLexical = (
  query: string,
  people: readonly Alumnus[],
): readonly Ranked[] => {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length > 1)

  return people
    .map((person) => {
      const hay = person.searchText ?? `${person.name} ${person.nowLine}`.toLowerCase()
      let score = 0
      for (const term of terms) if (hay.includes(term)) score += 1
      return { person, score: score / Math.max(terms.length, 1) }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * The instant filter that runs on every keystroke — no model, no network.
 * Every whitespace-separated term must appear, so typing narrows rather than
 * widens. This is what makes the field feel immediate while the 22MB model is
 * still downloading in the background.
 */
export const filterLocally = (
  query: string,
  people: readonly Alumnus[],
): readonly Alumnus[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return people
  return people.filter((person) => {
    const hay = person.searchText ?? person.name.toLowerCase()
    return terms.every((term) => hay.includes(term))
  })
}
