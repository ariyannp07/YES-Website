import type { Alumnus } from '@/lib/alumni'

/**
 * Ranking for the catalog. Ported from the yes-catalog scaffold.
 *
 * The scaffold ranked all 116 and showed all 116, on the principle that a wall
 * which goes blank reads as "nobody here". In practice that made every search
 * look identical below the fold: the tail is just the directory in a shuffled
 * order, and scrolling it implies a relevance that isn't there.
 *
 * So searching now CUTS — see `topMatches`. Browsing still shows everyone,
 * which is the honest way to keep the full wall reachable.
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


/** Never show more than this many matches for a search. */
export const MAX_RESULTS = 24

/**
 * A match must score at least this fraction of the best match to be shown.
 * Relative rather than absolute because cosine scores for this model sit in a
 * narrow band — a good match is ~0.3, not ~0.9 — so a fixed cutoff would either
 * pass everything or nothing depending on the query.
 */
const RELATIVE_FLOOR = 0.55

/** Below this, a result is noise regardless of how weak the field is. */
const ABSOLUTE_FLOOR = 0.1

/**
 * Always show at least this many, so a narrow query returns the closest things
 * rather than an empty page — the one part of the scaffold's rule worth keeping.
 */
const MIN_RESULTS = 3

/**
 * Cut a ranked list down to the results actually worth showing.
 *
 * Takes the ranking as given; the ordering decision belongs upstream.
 */
export const topMatches = (ranked: readonly Ranked[]): readonly Ranked[] => {
  if (ranked.length === 0) return ranked

  const best = ranked[0].score
  const floor = Math.max(best * RELATIVE_FLOOR, ABSOLUTE_FLOOR)

  const strong = ranked.filter((result) => result.score >= floor)
  const kept = strong.length >= MIN_RESULTS ? strong : ranked.slice(0, MIN_RESULTS)

  return kept.slice(0, MAX_RESULTS)
}
