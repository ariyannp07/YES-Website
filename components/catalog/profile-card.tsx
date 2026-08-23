'use client'

import Link from 'next/link'

import type { Alumnus } from '@/lib/alumni'

import { ProfileImage } from './profile-image'
import styles from './catalog.module.css'

interface ProfileCardProps {
  readonly person: Alumnus
  readonly rank: number
}

/**
 * One builder. The whole card is the link, so tabbing moves person to person
 * and Enter opens the dossier — the same keyboard contract the old mosaic had.
 *
 * The scroll position is stashed on click so returning from a dossier puts the
 * grid back exactly where it was rather than at the top.
 */
export function ProfileCard({ person, rank }: ProfileCardProps) {
  const chips = [person.sectors?.[0], person.venture].filter(Boolean) as string[]

  return (
    <li>
      <Link
        href={`/catalog/${person.slug}`}
        data-card
        className={styles.card}
        aria-label={`${person.name}, ${person.classYear}`}
        onClick={() => {
          try {
            sessionStorage.setItem('yes:catalog:scroll', String(window.scrollY))
          } catch {
            // Private browsing — losing the scroll position is not worth a crash.
          }
        }}
      >
        <span className={styles.cardMedia}>
          <ProfileImage name={person.name} photo={person.portraitColor} />
          <span className={styles.cardScrim} />
          <span className={styles.rank}>{String(rank).padStart(2, '0')}</span>
        </span>

        <span className={styles.cardBody}>
          <span className={styles.cardHead}>
            <span className={styles.cardName}>{person.name}</span>
            <span className={styles.cardYear}>{person.classYear}</span>
          </span>

          {person.venture ? (
            <span className={styles.cardRole}>{person.venture}</span>
          ) : null}

          <span className={styles.cardBio}>{person.bio ?? person.nowLine}</span>

          {chips.length > 0 ? (
            <span className={styles.chips}>
              {chips.map((chip) => (
                <span key={chip} className={styles.chip}>
                  {chip}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}
