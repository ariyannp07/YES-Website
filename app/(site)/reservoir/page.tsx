import type { Metadata } from 'next'
import Link from 'next/link'

import { KIND_LABELS, allEntries } from '@/lib/reservoir'

import styles from './reservoir.module.css'

export const metadata: Metadata = {
  title: 'Press',
  description: 'Coverage of the Yale Entrepreneurial Society and the people in it.',
}

/**
 * The Reservoir index — and the header's Press destination.
 *
 * This route used to `permanentRedirect('/#press')`, which was fine while the
 * landing carried a press section. That section is gone, so the redirect would
 * now bounce a reader to a scroll position that does not exist. The index it
 * used to defer to lives here instead.
 *
 * Entries with a `url` are hosted by their publication and open there; the rest
 * have a page at `/reservoir/<slug>`. `lib/reservoir.ts` reads them from Git at
 * BUILD time, so a new piece is a commit, never a fetch.
 */
export default function ReservoirPage() {
  const entries = allEntries()

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Press</h1>
      <p className={styles.standfirst}>
        Coverage of the society and the people in it, newest first.
      </p>

      {entries.length === 0 ? (
        <p className={styles.empty}>[ Nothing published yet. ]</p>
      ) : (
        <div className={styles.list}>
          {entries.map((entry) => {
            const external = Boolean(entry.url)
            const label = entry.publication ?? KIND_LABELS[entry.kind]
            const body = (
              <>
                <span className={styles.date}>{entry.date}</span>
                <strong>{entry.title}</strong>
                <span className={styles.source}>{label}</span>
                <span className={styles.arrow} aria-hidden="true">
                  {external ? '↗' : '→'}
                </span>
              </>
            )

            return external ? (
              <a
                key={entry.slug}
                className={styles.row}
                href={entry.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {body}
              </a>
            ) : (
              <Link
                key={entry.slug}
                className={styles.row}
                href={`/reservoir/${entry.slug}`}
              >
                {body}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
