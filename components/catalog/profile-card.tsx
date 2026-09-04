'use client'

import type { Alumnus } from '@/lib/alumni'

import { ProfileImage } from './profile-image'
import styles from './catalog.module.css'

export function ProfileCard({ person }: { readonly person: Alumnus }) {
  const uncertain = person.directoryStatus === 'uncertain'

  if (uncertain) {
    return (
      <li className={styles.uncertainItem}>
        <article className={styles.uncertainCard} aria-label={`${person.name}, uncertain`}>
          <span className={styles.uncertainMedia}>
            <ProfileImage name={person.name} photo={person.portraitColor} />
          </span>
          <span className={styles.uncertainBody}>
            <span className={styles.uncertainName}>{person.name}</span>
            {person.nowLine !== 'Uncertain' ? (
              <span className={styles.uncertainTitle}>{person.nowLine}</span>
            ) : null}
            <span className={styles.uncertainRole}>Uncertain</span>
          </span>
        </article>
      </li>
    )
  }

  const membership = person.directoryRole ?? 'Member of YES'
  const showCurrentTitle = person.nowLine !== membership
  const links = [
    person.companyUrl ? { href: person.companyUrl, label: 'Website' } : null,
    person.linkedinUrl ? { href: person.linkedinUrl, label: 'LinkedIn' } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link))

  return (
    <li className={styles.confirmedItem}>
      <article
        className={styles.card}
        tabIndex={0}
        aria-label={`${person.name}, ${membership}. Focus to reveal profile details.`}
      >
        <span className={styles.cardMedia}>
          <ProfileImage name={person.name} photo={person.portraitColor} />
        </span>

        <span className={styles.cardInfo}>
          <span className={styles.cardHeader}>
            <span className={styles.cardRole}>{membership}</span>
            <span className={styles.cardName}>{person.name}</span>
            {showCurrentTitle ? (
              <span className={styles.cardTitle}>{person.nowLine}</span>
            ) : null}
          </span>

          {person.bio ? <span className={styles.cardBio}>{person.bio}</span> : null}

          {links.length > 0 ? (
            <span className={styles.cardLinks} aria-label={`${person.name} links`}>
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {link.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </span>
          ) : null}
        </span>
      </article>
    </li>
  )
}
