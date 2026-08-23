'use client'

import { useEffect, useState } from 'react'

import { modelState, onModelProgress, type ModelProgress } from '@/lib/catalog/embedder'

import styles from './catalog.module.css'

/**
 * What the page shows while the field gathers and the query is embedded.
 *
 * It reports the model download honestly. The first search on a cold cache
 * pulls ~22MB, and a progress figure is the difference between "this is
 * working" and "this is broken".
 */
export function SearchingOverlay({ query }: { readonly query: string }) {
  const [progress, setProgress] = useState<ModelProgress>(modelState())

  useEffect(() => onModelProgress(setProgress), [])

  return (
    <div data-search-overlay className={styles.overlay}>
      <p className={styles.overlayLabel}>Searching the catalog</p>
      <p className={`${styles.overlayQuery} cat-shimmer`}>{query}</p>
      {progress.status === 'loading' ? (
        <p className={styles.modelNote}>
          Loading the search model — {Math.round(progress.pct)}%
        </p>
      ) : null}
      {progress.status === 'error' ? (
        <p className={styles.modelNote}>
          Search model unavailable — ranking by keyword instead
        </p>
      ) : null}
    </div>
  )
}
