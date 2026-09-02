'use client'

import { useCallback, useMemo, useState } from 'react'

import type { Alumnus } from '@/lib/alumni'
import { embedQuery, getEmbedder } from '@/lib/catalog/embedder'
import {
  filterLocally,
  rankBySimilarity,
  rankLexical,
  topMatches,
  type Ranked,
} from '@/lib/catalog/search'

import { ResultsGrid } from './results-grid'
import { SearchField } from './search-field'
import styles from './catalog.module.css'

interface CatalogExperienceProps {
  readonly people: readonly Alumnus[]
  readonly vectors: Readonly<Record<string, readonly number[]>>
}

export function CatalogExperience({ people, vectors }: CatalogExperienceProps) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<readonly Ranked[] | null>(null)
  const [searching, setSearching] = useState(false)

  const everyone = useMemo(
    () => people.map((person) => ({ person, score: 0 })),
    [people],
  )

  const liveMatches = useMemo(() => {
    if (!query.trim()) return everyone
    if (matches) return matches
    return filterLocally(query, people).map((person) => ({ person, score: 0 }))
  }, [everyone, matches, people, query])

  const warmModel = useCallback(() => {
    getEmbedder().catch(() => {
      // A blocked model CDN still leaves immediate lexical filtering available.
    })
  }, [])

  const updateQuery = useCallback((value: string) => {
    setQuery(value)
    setMatches(null)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setMatches(null)
    setSearching(false)
  }, [])

  const runSearch = useCallback(
    async (value: string) => {
      setSearching(true)
      const startedAt = performance.now()
      try {
        const vector = await embedQuery(value)
        setMatches(topMatches(rankBySimilarity(vector, people, vectors)))
      } catch {
        setMatches(topMatches(rankLexical(value, people)))
      } finally {
        const remaining = 420 - (performance.now() - startedAt)
        if (remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining))
        }
        setSearching(false)
      }
    },
    [people, vectors],
  )

  return (
    <div className={styles.stage}>
      <header className={styles.header}>
        <h1>People</h1>

        <div className={styles.searchBlock}>
          <SearchField
            value={query}
            searching={searching}
            onChange={updateQuery}
            onSubmit={runSearch}
            onClear={clearSearch}
            onFirstFocus={warmModel}
          />
        </div>
      </header>

      <section className={styles.directory} aria-label="Builder directory">
        <div className={styles.toolbar}>
          <p aria-live="polite">
            {query
              ? `${liveMatches.length} matches for “${query}”`
              : `${people.length} YES members and associates`}
          </p>
        </div>

        <ResultsGrid results={liveMatches} searching={searching} />
      </section>
    </div>
  )
}
