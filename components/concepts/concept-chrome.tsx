import Link from 'next/link'

import styles from './concept-chrome.module.css'

/**
 * REVIEW CHROME — not part of any concept.
 *
 * Lets the owners flip between the three prototypes while comparing them.
 * Deleted along with /concepts once a direction is chosen.
 */

export const CONCEPTS = [
  { slug: 'signal', label: 'Signal' },
  { slug: 'blueprint', label: 'Blueprint' },
  { slug: 'portal', label: 'Portal' },
] as const

export type ConceptSlug = (typeof CONCEPTS)[number]['slug']

export function ConceptChrome({ current }: { readonly current: ConceptSlug }) {
  return (
    <nav className={`${styles.chrome} t-micro`} aria-label="Prototype switcher">
      <span className={styles.tag}>Prototype</span>
      {CONCEPTS.map((concept) => (
        <Link
          key={concept.slug}
          href={`/concepts/${concept.slug}`}
          className={`${styles.link} ${concept.slug === current ? styles.current : ''}`}
        >
          {concept.label}
        </Link>
      ))}
      <Link href="/concepts" className={styles.link}>
        All
      </Link>
    </nav>
  )
}
