import type { Metadata } from 'next'
import Link from 'next/link'

import { MANIFESTO } from '@/content/manifesto'
import { allEssays, type WritingEntry } from '@/lib/writing'

export const metadata: Metadata = {
  title: 'Writing',
}

/**
 * Reverse-chronological list of essays and dispatches (build spec §3).
 *
 * The manifesto is listed here as the first entry but is not duplicated — it
 * links to /manifesto, which holds the canonical copy.
 */
const MANIFESTO_ENTRY: WritingEntry = {
  href: '/manifesto',
  title: 'Manifesto',
  date: '2026-08-15',
  summary: 'What YES believes, and why Yale lags.',
}

export default function WritingPage() {
  const entries: readonly WritingEntry[] = [
    MANIFESTO_ENTRY,
    ...allEssays().map((essay) => ({
      href: `/writing/${essay.slug}`,
      title: essay.title,
      date: essay.date,
      summary: essay.summary,
    })),
  ]
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="page-top" style={{ maxWidth: '52rem', marginInline: 'auto' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {entries.map((entry) => (
          <li key={entry.href} style={{ marginBottom: 'clamp(2.5rem, 7vh, 4rem)' }}>
            <p className="t-micro" style={{ color: 'var(--muted)', margin: '0 0 0.75rem' }}>
              {entry.date}
            </p>

            <p className="t-display" style={{ margin: 0 }}>
              <Link href={entry.href}>{entry.title}</Link>
            </p>

            {entry.summary ? (
              <p
                className="t-small measure"
                style={{ margin: '0.75rem 0 0', color: 'var(--muted)' }}
              >
                {entry.summary}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      {MANIFESTO.approved ? null : (
        <p className="t-micro" style={{ color: 'var(--muted)', marginTop: '4rem' }}>
          More dispatches as they are written.
        </p>
      )}
    </div>
  )
}
