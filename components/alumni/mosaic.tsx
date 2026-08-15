import Link from 'next/link'

import { Silhouette } from '@/components/alumni/silhouette'
import type { Alumnus } from '@/lib/alumni'

import styles from './mosaic.module.css'

/**
 * The wall. A server component — the whole reveal is CSS, and every tile is a
 * real link, which is what makes the page keyboard-navigable by construction:
 * tab moves through faces, Enter opens the dossier, Esc closes it.
 */
export function Mosaic({ people }: { readonly people: readonly Alumnus[] }) {
  return (
    <div className={styles.mosaic}>
      {people.map((person) => (
        <Link
          key={person.slug}
          href={`/alumni/${person.slug}`}
          className={styles.tile}
          data-weight={person.weight}
          aria-label={
            person.placeholder
              ? 'Placeholder portrait — awaiting consented alumni'
              : `${person.name}, ${person.classYear}`
          }
        >
          <span className={`${styles.layer} ${styles.colorLayer}`}>
            {person.portraitColor ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.portraitColor} alt="" loading="lazy" />
            ) : (
              <Silhouette seed={`${person.slug}-color`} />
            )}
          </span>

          <span className={`${styles.layer} ${styles.duotoneLayer}`}>
            {person.portraitDuotone ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.portraitDuotone} alt="" loading="lazy" />
            ) : (
              <Silhouette seed={person.slug} />
            )}
          </span>

          <span className={`${styles.label} t-micro`}>
            <span className={styles.name}>{person.name}</span>
            <span className={styles.year}>{person.classYear}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
