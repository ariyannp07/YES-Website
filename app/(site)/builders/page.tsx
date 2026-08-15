import type { Metadata } from 'next'

import { fetchCatalogFeed, type Builder } from '@/lib/airtable/catalog-feed'
import { alumniFeedConfigured } from '@/lib/alumni'
import { BUILDERS_MIN_ENTRIES } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Builders',
}

/**
 * The public builder catalog (build spec §3).
 *
 * `force-static` is load-bearing, not an optimisation. It guarantees the feed
 * is read at BUILD time and never per-request, so a newly consented row reaches
 * the public site only when a human triggers a deploy — canon
 * 05-human-ai-policy R1: "Publishing the public catalog is a human-run deploy,
 * not a cron job." There is deliberately no revalidate and no cron.
 *
 * The page ships dark: it is routable but unlinked from the nav until the
 * catalog clears BUILDERS_MIN_ENTRIES (build spec §3, §7.6).
 */
export const dynamic = 'force-static'

const Ledger = ({ builders }: { readonly builders: readonly Builder[] }) => (
  <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
    {builders.map((builder) => (
      <li key={builder.slug} style={{ marginBottom: 'clamp(1.75rem, 4vh, 2.5rem)' }}>
        <p className="t-small" style={{ margin: 0 }}>
          <span style={{ color: 'var(--fg)' }}>{builder.name}</span>
          {builder.affiliation ? (
            <span style={{ color: 'var(--muted)' }}> · {builder.affiliation}</span>
          ) : null}
        </p>
        <p
          className="t-small measure"
          style={{ margin: '0.35rem 0 0', color: 'var(--muted)', lineHeight: 1.7 }}
        >
          {builder.profile}
        </p>
      </li>
    ))}
  </ol>
)

export default async function BuildersPage() {
  const builders = alumniFeedConfigured() ? await fetchCatalogFeed() : []
  const populated = builders.length >= BUILDERS_MIN_ENTRIES

  return (
    <div className="page-top" style={{ maxWidth: '52rem', marginInline: 'auto' }}>
      {populated ? (
        <Ledger builders={builders} />
      ) : (
        <p className="t-micro measure" style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          [ Dark until {BUILDERS_MIN_ENTRIES} builders have consented. Currently{' '}
          {builders.length}. This page is unlinked from the nav until then. ]
        </p>
      )}
    </div>
  )
}
