import type { Metadata } from 'next'
import Link from 'next/link'

import {
  KIND_LABELS,
  allEntries,
  type ReservoirItem,
} from '@/lib/reservoir'

export const metadata: Metadata = {
  title: 'The Reservoir',
}

/**
 * The Reservoir (build spec §3, the writing page, broadened at the owners'
 * direction): the public collection — essays, the speaker series, workshops and
 * online lessons, in one reverse-chronological index.
 *
 * The manifesto is listed here as an entry but is not duplicated — it links to
 * /manifesto, which holds the canonical copy.
 */
const MANIFESTO_ITEM: ReservoirItem = {
  href: '/manifesto',
  title: 'Manifesto',
  date: '2026-08-15',
  kind: 'essay',
  summary: 'What YES believes, and why Yale lags.',
  external: false,
}

export default function ReservoirPage() {
  const items: readonly ReservoirItem[] = [
    MANIFESTO_ITEM,
    ...allEntries().map((entry) => ({
      href: entry.url ?? `/reservoir/${entry.slug}`,
      title: entry.title,
      date: entry.date,
      kind: entry.kind,
      summary: entry.summary,
      external: Boolean(entry.url),
    })),
  ]
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="page-top" style={{ maxWidth: '52rem', marginInline: 'auto' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.href}
            style={{ marginBottom: 'clamp(2.5rem, 7vh, 4rem)' }}
          >
            <p
              className="t-micro"
              style={{ color: 'var(--muted)', margin: '0 0 0.75rem' }}
            >
              {item.date} · {KIND_LABELS[item.kind]}
            </p>

            <p className="t-display" style={{ margin: 0 }}>
              {item.external ? (
                <a href={item.href} rel="noreferrer noopener" target="_blank">
                  {item.title}
                </a>
              ) : (
                <Link href={item.href}>{item.title}</Link>
              )}
            </p>

            {item.summary ? (
              <p
                className="t-small measure"
                style={{ margin: '0.75rem 0 0', color: 'var(--muted)' }}
              >
                {item.summary}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
