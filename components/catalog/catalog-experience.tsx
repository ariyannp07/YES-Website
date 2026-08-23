'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'

import type { Alumnus } from '@/lib/alumni'
import { embedQuery, getEmbedder } from '@/lib/catalog/embedder'
import {
  MAX_RESULTS,
  rankBySimilarity,
  rankLexical,
  topMatches,
  type Ranked,
} from '@/lib/catalog/search'

import { ResultsGrid } from './results-grid'
import { SearchField } from './search-field'
import { SearchingOverlay } from './searching-overlay'
import ThreeStage, { type ThreeStageHandle } from './three-stage'
import styles from './catalog.module.css'

type Phase = 'browsing' | 'searching'

/**
 * How long the gather animation holds the stage before results appear. The
 * scaffold used a random 2–5s that could not be skipped; that is a long time to
 * wait for a flourish, and randomness makes the same search feel broken on one
 * run and fine on the next. One deterministic beat reads as intentional, and
 * reduced motion removes it.
 */
const GATHER_BEAT_MS = 1500

/**
 * How long after the burst starts the grid appears. Matches the point in the
 * stage's burst where the field has cleared.
 *
 * The reveal is scheduled HERE rather than fired from the animation's own
 * timeline. Routing it through the timeline made showing results conditional on
 * the animation running — and when that callback was dropped, the page sat on
 * the searching overlay forever with the answer already computed. The stage
 * animates; the app decides when to show results.
 */
const REVEAL_AFTER_BURST_MS = 620

// Versioned: a session stored before search gained a relevance cutoff holds a
// full-directory slug list, which would come back as a match for every builder
// should now return a handful.
const RESTORE_KEY = 'yes:catalog:results:v2'
const SCROLL_KEY = 'yes:catalog:scroll'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface CatalogExperienceProps {
  readonly people: readonly Alumnus[]
  readonly vectors: Readonly<Record<string, readonly number[]>>
}

/**
 * The catalog. Ported from the yes-catalog scaffold at the owners' direction.
 *
 * THE HERO IS THE ENTRY; THE WALL IS ALREADY BEHIND IT. The scaffold gated the
 * grid behind a search, so arriving at a catalog showed no catalog and the
 * faces cost a click and a wait. Removing the hero to fix that threw away the
 * moment the page is built around, which was worse. Both now hold: the hero
 * gets the first screen, and every builder is in the SAME server-rendered HTML
 * directly beneath it — one scroll away, nothing to load, nothing to click.
 *
 * Search runs entirely in the browser — see lib/catalog/embedder.ts — so there
 * is no API key, no server route, and no record of what anyone searched for.
 */
export function CatalogExperience({ people, vectors }: CatalogExperienceProps) {
  const [phase, setPhase] = useState<Phase>('browsing')
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<readonly Ranked[] | null>(null)

  const stage = useRef<ThreeStageHandle>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)
  const restored = useRef(false)

  const scrollToGrid = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gridRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  /** Everyone, in the owners' order. The resting state of the page. */
  const everyone = useMemo(
    (): readonly Ranked[] => people.map((person) => ({ person, score: 0 })),
    [people],
  )

  const shown = matches ?? everyone
  const searching = query.length > 0 && matches !== null

  // The model is NOT warmed on mount. It is ~22MB, and downloading it for
  // every visitor who only came to look at the wall is exactly the kind of cost
  // that makes a page feel slow for no benefit. First focus of the field is the
  // earliest honest signal that someone intends to search.
  const warmModel = useCallback(() => {
    getEmbedder().catch(() => {
      // Offline or CDN blocked — search falls back to lexical ranking.
    })
  }, [])

  // Put the grid back when returning from a dossier.
  useClientLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem(RESTORE_KEY)
      if (!saved) return
      const { q, slugs } = JSON.parse(saved) as { q: string; slugs: string[] }
      if (!q) return
      const bySlug = new Map(people.map((person) => [person.slug, person]))
      const list = slugs
        .map((slug) => bySlug.get(slug))
        .filter((person): person is Alumnus => Boolean(person))
        .map((person) => ({ person, score: 0 }))
      if (list.length === 0) return
      restored.current = true
      setQuery(q)
      setMatches(list)
      requestAnimationFrame(() => stage.current?.setDim(true))
    } catch {
      // Fresh session, or storage unavailable.
    }
  }, [people])

  useEffect(() => {
    if (phase !== 'browsing') return
    if (restored.current) {
      const y = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0)
      requestAnimationFrame(() => window.scrollTo(0, y))
      return
    }
  }, [phase])

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

  const showEveryone = useCallback(() => {
    seq.current += 1
    restored.current = false
    setQuery('')
    setMatches(null)
    setPhase('browsing')
    try {
      sessionStorage.removeItem(RESTORE_KEY)
    } catch {
      // Non-fatal.
    }
    window.scrollTo(0, 0)
  }, [])

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
        const final = topMatches(ranked)
        if (!reduce) {
          gsap.to('[data-search-overlay]', {
            opacity: 0,
            y: -18,
            duration: 0.5,
            ease: 'power2.in',
          })
        }
        const reveal = () => {
          if (seq.current !== mine) return
          setMatches(final)
          setPhase('browsing')
          remember(q, final)
          window.scrollTo(0, 0)
        }

        // Play the burst for its own sake; the callback is deliberately empty.
        stage.current?.resolve(() => {})
        window.setTimeout(reveal, reduce ? 0 : REVEAL_AFTER_BURST_MS)
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
          // Offline, or the model CDN is unreachable.
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

      {phase === 'searching' ? (
        <div className={styles.layer}>
          <SearchingOverlay query={query} />
        </div>
      ) : (
        <div className={`${styles.layer} ${styles.resultsShell}`}>
          {searching ? (
            <header className={styles.resultsHeader}>
              <SearchField
                key={query}
                variant="top"
                initial={query}
                onSubmit={runSearch}
                onFirstFocus={warmModel}
              />
            </header>
          ) : (
            <section className={styles.hero}>
              <h1 className={styles.heroTitle}>Yale builders</h1>
              <p className={styles.heroLede}>
                {people.length} people who chose to build. Ask for what you are
                looking for — a problem, a sector, a name.
              </p>
              <SearchField onSubmit={runSearch} onFirstFocus={warmModel} />
              <button type="button" className={styles.submit} onClick={scrollToGrid}>
                or see all {people.length} &darr;
              </button>
            </section>
          )}

          <div ref={gridRef} className={styles.resultsBody}>
            <p className={styles.summary}>
              {searching ? (
                <>
                  <span>
                    {shown.length === MAX_RESULTS ? 'Closest ' : ''}
                    {shown.length} {shown.length === 1 ? 'match' : 'matches'} for
                    &ldquo;{query}&rdquo;
                  </span>{' '}
                  <button type="button" className={styles.reset} onClick={showEveryone}>
                    Show all {people.length}
                  </button>
                </>
              ) : (
                <span>
                  {people.length} builders. Search for a problem, a sector, or a name.
                </span>
              )}
            </p>

            <ResultsGrid
              results={shown}
              animateKey={query}
              animate={searching && !restored.current}
            />
          </div>
        </div>
      )}
    </div>
  )
}
