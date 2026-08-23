'use client'

import { useMemo, useRef, useState } from 'react'

import { Mosaic } from '@/components/alumni/mosaic'
import type { Alumnus } from '@/lib/alumni'

import styles from './mosaic.module.css'

/**
 * The catalog wall, searchable.
 *
 * 107 faces is past the point where a wall alone is browsable, so search sits
 * above it. Filtering runs over a lowercase haystack precomputed at import time
 * (name, role, venture, school, bio, sectors, technical domains, keywords), so
 * a keystroke is one `includes` per person rather than a rebuild.
 *
 * With no query the featured builders come first, in the owners' order, then
 * everyone else alphabetically. There is no "Featured" heading — build spec §3
 * bans announcing rank, so the only marker is a hairline rule.
 */
type SemanticState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'thinking' }
  | { readonly kind: 'done'; readonly query: string; readonly slugs: readonly string[] }
  | { readonly kind: 'failed' }

export function CatalogBrowser({ people }: { readonly people: readonly Alumnus[] }) {
  const [query, setQuery] = useState('')
  const [semantic, setSemantic] = useState<SemanticState>({ kind: 'idle' })
  const request = useRef(0)

  const trimmed = query.trim().toLowerCase()

  /**
   * Two-tier search. Typing filters locally and instantly over a precomputed
   * haystack — free, offline, no round trip. Enter sends the query to Grok,
   * which understands intent the substring filter cannot ("who works on
   * robotics in Africa"). The model never sees the browser: the key lives on
   * the server and the client only ever receives slugs.
   */
  const runSemantic = async () => {
    const q = query.trim()
    if (q.length < 2) return

    const ticket = request.current + 1
    request.current = ticket
    setSemantic({ kind: 'thinking' })

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        slugs?: string[]
      }

      // A slower earlier request must not overwrite a newer one.
      if (request.current !== ticket) return

      if (!response.ok || !body.ok || !Array.isArray(body.slugs)) {
        setSemantic({ kind: 'failed' })
        return
      }
      setSemantic({ kind: 'done', query: q, slugs: body.slugs })
    } catch {
      if (request.current === ticket) setSemantic({ kind: 'failed' })
    }
  }

  const { featured, rest, total } = useMemo(() => {
    // A finished semantic result for the current query outranks the local
    // filter, and keeps the model's ordering.
    if (semantic.kind === 'done' && semantic.query.toLowerCase() === trimmed) {
      const bySlug = new Map(people.map((p) => [p.slug, p]))
      const hits = semantic.slugs
        .map((slug) => bySlug.get(slug))
        .filter((p): p is Alumnus => p !== undefined)
      return { featured: [], rest: hits, total: hits.length }
    }

    if (!trimmed) {
      return {
        featured: people.filter((p) => p.featured),
        rest: people.filter((p) => !p.featured),
        total: people.length,
      }
    }

    // Every whitespace-separated term must appear, so "robotics oliver" narrows
    // rather than widening the way an OR would.
    const terms = trimmed.split(/\s+/)
    const hits = people.filter((person) => {
      const hay = person.searchText ?? `${person.name} ${person.nowLine}`.toLowerCase()
      return terms.every((term) => hay.includes(term))
    })

    return { featured: [], rest: hits, total: hits.length }
  }, [people, trimmed, semantic])

  return (
    <>
      <label className={styles.search}>
        <input
          className={`${styles.searchInput} t-small`}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (semantic.kind !== 'idle') setSemantic({ kind: 'idle' })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void runSemantic()
            }
          }}
          placeholder="Search builders — or ask, then press Enter"
          aria-label="Search builders by name, venture, sector or technology. Press Enter to search by meaning."
        />
        <span className={`${styles.count} t-micro`} role="status">
          {semantic.kind === 'thinking'
            ? 'Searching…'
            : semantic.kind === 'failed'
              ? `Semantic search unavailable — showing ${total} text matches`
              : semantic.kind === 'done' && semantic.query.toLowerCase() === trimmed
                ? `${total} by meaning · press Esc to clear`
                : trimmed
                  ? `${total} of ${people.length} · press Enter to search by meaning`
                  : `${people.length} builders`}
        </span>
      </label>

      {featured.length > 0 ? (
        <>
          <Mosaic people={featured} />
          <hr className={styles.rule} />
        </>
      ) : null}

      {rest.length > 0 ? <Mosaic people={rest} /> : null}

      {total === 0 ? (
        <p className={`${styles.empty} t-small`}>Nobody matches that yet.</p>
      ) : null}
    </>
  )
}
