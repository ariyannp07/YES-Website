'use client'

import type { Ranked } from '@/lib/catalog/search'

import { ProfileCard } from './profile-card'
import styles from './catalog.module.css'

export function ResultsGrid({
  results,
  searching,
}: {
  readonly results: readonly Ranked[]
  readonly searching: boolean
}) {
  if (results.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>No exact match yet.</h2>
        <p>Try a broader problem, sector, or name.</p>
      </div>
    )
  }

  return (
    <ul
      className={`${styles.grid} ${searching ? styles.gridSearching : ''}`}
      aria-busy={searching}
    >
      {results.map((result) => (
        <ProfileCard key={result.person.slug} person={result.person} />
      ))}
    </ul>
  )
}
