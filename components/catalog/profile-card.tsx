'use client'

import Link from 'next/link'

import type { Alumnus } from '@/lib/alumni'

import { ProfileImage } from './profile-image'
import styles from './catalog.module.css'

export function ProfileCard({ person }: { readonly person: Alumnus }) {
  return (
    <li>
      <Link
        href={`/catalog/${person.slug}`}
        className={styles.card}
        aria-label={`${person.name}, ${person.classYear}`}
      >
        <span className={styles.cardMedia}>
          <ProfileImage name={person.name} photo={person.portraitColor} />
        </span>

        <span className={styles.cardBody}>
          <span className={styles.cardName}>{person.name}</span>
          <span className={styles.cardRole}>{person.venture ?? person.nowLine}</span>
        </span>
      </Link>
    </li>
  )
}
