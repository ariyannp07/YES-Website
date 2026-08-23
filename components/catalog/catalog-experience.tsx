'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

import type { Alumnus } from '@/lib/alumni'
import { embedQuery, getEmbedder } from '@/lib/catalog/embedder'
import { rankBySimilarity, rankLexical, type Ranked } from '@/lib/catalog/search'

import { ResultsGrid } from './results-grid'
import { SearchField } from './search-field'
import { SearchingOverlay } from './searching-overlay'
import ThreeStage, { type ThreeStageHandle } from './three-stage'
import styles from './catalog.module.css'

type Phase = 'hero' | 'searching' | 'results'

/**
 * How long the gather animation is allowed to hold the stage before results
 * appear. The scaffold used a random 2–5s that could not be skipped; that is a
 * long time to make someone wait for a flourish, and randomness means the same
 * search feels broken on one run and fine on the next. A single deterministic
 * beat is enough to read as intentional, and reduced motion removes it entirely.
 */
const GATHER_BEAT_MS = 1500

const RESTORE_KEY = 'yes:catalog:results'
const SCROLL_KEY = 'yes:catalog:scroll'

// useLayoutEffect on the client so the hero never flashes for a frame when
// returning from a dossier; the plain effect keeps the server render quiet.
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface CatalogExperienceProps {
  readonly people: readonly Alumnus[]
  readonly vectors: Readonly<Record<string, readonly number[]>>
}

/**
 * The catalog. Ported from the yes-catalog scaffold at the owners' direction.
 *
 * Three phases over one fixed particle field: a hero that asks, a gather while
 * the query is embedded, and the grid. Search runs entirely in the browser —
 * see lib/catalog/embedder.ts for why — so there is no API key, no server route
 * and nothing recorded about what anyone searched for.
 */
export function CatalogExperience({ people, vectors }: CatalogExperienceProps) {
  const [phase, setPhase] = useState<Phase>('hero')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly Ranked[] | null>(null)

  const stage = useRef<ThreeStageHandle>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)
  const restored = useRef(false)

  const browseOrder = useCallback(
    (): readonly Ranked[] => people.map((person) => ({ person, score: 0 })),
    [people],
  )

  // Warm the model in the background so the first search does not pay for the
  // download. Failure is fine — search falls back to lexical ranking.
  useEffect(() => {
    getEmbedder().catch(() => {})
  }, [])

  // Put the grid back when returning from a dossier.
  useClientLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem(RESTORE_KEY)
      if (!saved) return
      const { q, slugs } = JSON.parse(saved) as { q: string; slugs: string[] }
      const bySlug = new Map(people.map((person) => [person.slug, person]))
      const list = slugs
        .map((slug) => bySlug.get(slug))
        .filter((person): person is Alumnus => Boolean(person))
        .map((person) => ({ person, score: 0 }))
      if (list.length === 0) return
      restored.current = true
      setQuery(q)
      setResults(list)
      setPhase('results')
      requestAnimationFrame(() => stage.current?.setDim(true))
    } catch {
      // Fresh session, or storage unavailable.
    }
  }, [people])

  useEffect(() => {
    if (phase !== 'results' || !resultsRef.current) return
    if (restored.current) {
      const y = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0)
      requestAnimationFrame(() => window.scrollTo(0, y))
      return
    }
    window.scrollTo(0, 0)
  }, [phase, query])

  const remember = useCallback((q: string, list: readonly Ranked[]) => {
    try {
      sessionStorage.setItem(
        RESTORE_KEY,
        JSON.stringify({ q, slugs: list.map((r) => r.person.slug) }),
      )
    } catch {
      // Non-fatal.
    }
  }, [])

  const backToHero = useCallback(() => {
    seq.current += 1
    setPhase('hero')
    setResults(null)
    setQuery('')
    try {
      sessionStorage.removeItem(RESTORE_KEY)
    } catch {
      // Non-fatal.
    }
    stage.current?.reset()
  }, [])

  const browseAll = useCallback(() => {
    const list = browseOrder()
    restored.current = false
    setQuery('')
    setResults(list)
    setPhase('results')
    remember('', list)
    requestAnimationFrame(() => stage.current?.setDim(true))
  }, [browseOrder, remember])

  const runSearch = useCallback(
    (q: string) => {
      const mine = ++seq.current
      restored.current = false
      try {
        sessionStorage.removeItem(SCROLL_KEY)
      } catch {
        // Non-fatal.
      }
      setQuery(q)
      setPhase('searching')
      stage.current?.enterSearch()

      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      let beatDone = reduce
      let ranked: readonly Ranked[] | null = null

      const settle = () => {
        if (!beatDone || !ranked || seq.current !== mine) return
        const final = ranked
        if (!reduce) {
          gsap.to('[data-search-overlay]', {
            opacity: 0,
            y: -18,
            duration: 0.5,
            ease: 'power2.in',
          })
        }
        stage.current?.resolve(() => {
          if (seq.current !== mine) return
          setResults(final)
          setPhase('results')
          remember(q, final)
        })
      }

      if (!reduce) {
        window.setTimeout(() => {
          beatDone = true
          settle()
        }, GATHER_BEAT_MS)
      }

      embedQuery(q)
        .then((vector) => {
          ranked = rankBySimilarity(vector, people, vectors)
          settle()
        })
        .catch(() => {
          // Offline, or the model CDN is unreachable. Still ranks everyone.
          ranked = rankLexical(q, people)
          settle()
        })
    },
    [people, vectors, remember],
  )

  return (
    <div data-scope="catalog" className={styles.stage}>
      <div className={styles.backdrop}>
        <ThreeStage ref={stage} />
      </div>
      <div className={`${styles.vignetteLayer} cat-vignette`} />

      {phase === 'hero' ? (
        <div className={styles.layer}>
          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>Yale builders</h1>
            <p className={styles.heroLede}>
              {people.length} people who chose to build. Ask for what you are
              looking for — a problem, a sector, a name.
            </p>
            <SearchField onSubmit={runSearch} autoFocus />
            <button type="button" className={styles.submit} onClick={browseAll}>
              or see all {people.length}
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'searching' ? (
        <div className={styles.layer}>
          <SearchingOverlay query={query} />
        </div>
      ) : null}

      {phase === 'results' && results ? (
        <div ref={resultsRef} className={`${styles.layer} ${styles.resultsShell}`}>
          <header className={styles.resultsHeader}>
            <button type="button" className={styles.back} onClick={backToHero}>
              <span aria-hidden="true">&larr;</span> Back
            </button>
            <SearchField key={query} variant="top" initial={query} onSubmit={runSearch} />
          </header>

          <div className={styles.resultsBody}>
            <ResultsGrid
              results={results}
              animateKey={query}
              animate={!restored.current}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
