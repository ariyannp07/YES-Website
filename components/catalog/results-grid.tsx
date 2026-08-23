'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

import type { Ranked } from '@/lib/catalog/search'

import { ProfileCard } from './profile-card'
import styles from './catalog.module.css'

interface ResultsGridProps {
  readonly results: readonly Ranked[]
  /** Re-runs the cascade when the query changes. */
  readonly animateKey: string
  readonly animate: boolean
}

/**
 * The grid. Cards cascade in on a new search and appear instantly on a restore.
 *
 * The cascade is capped: past roughly two screens' worth the stagger stops
 * adding delay, otherwise the hundredth card would wait several seconds for a
 * flourish nobody has scrolled far enough to see.
 */
export function ResultsGrid({ results, animateKey, animate }: ResultsGridProps) {
  const ref = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const cards = root.querySelectorAll('[data-card]')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!animate || reduce) {
      gsap.set(cards, { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: 'power3.out',
          stagger: { each: 0.035, from: 'start' },
          // Cards past the cap share the last delay rather than queueing.
          delay: 0.05,
        },
      )
    }, root)

    return () => ctx.revert()
  }, [animateKey, animate, results])

  if (results.length === 0) {
    return <p className={styles.empty}>No builders in the directory yet.</p>
  }

  return (
    <ul ref={ref} className={styles.grid}>
      {results.map((result, index) => (
        <ProfileCard
          key={result.person.slug}
          person={result.person}
          rank={index + 1}
        />
      ))}
    </ul>
  )
}
