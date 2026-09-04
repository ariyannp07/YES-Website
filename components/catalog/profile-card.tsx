'use client'

import Link from 'next/link'

import type { Alumnus } from '@/lib/alumni'

import { ProfileImage } from './profile-image'
import styles from './catalog.module.css'

export function ProfileCard({ person }: { readonly person: Alumnus }) {
  const subtitle = person.directoryRole ?? person.venture ?? person.nowLine

  return (
    <li>
      <Link
        href={`/catalog/${person.slug}`}
        className={styles.card}
        aria-label={`${person.name}, ${subtitle}`}
      >
        <span className={styles.cardMedia}>
          <ProfileImage name={person.name} photo={person.portraitColor} />
        </span>

        <span className={styles.cardBody}>
          <span className={styles.cardName}>{person.name}</span>
          <span className={styles.cardRole}>{subtitle}</span>
        </span>
      </Link>
    </li>
  )
}
