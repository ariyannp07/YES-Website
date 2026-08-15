import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DraftNotice } from '@/components/draft-notice'
import { KIND_LABELS, allEntries, entryBySlug } from '@/lib/reservoir'

const DRAFT_LABEL = 'DRAFT — AWAITING OWNER APPROVAL'

/** Only entries hosted here get a page; anything with a `url` lives elsewhere. */
export function generateStaticParams() {
  return allEntries()
    .filter((entry) => !entry.url)
    .map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = entryBySlug(slug)

  return entry ? { title: entry.title } : {}
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const entry = entryBySlug(slug)

  if (!entry) notFound()

  return (
    <article className="measure page-top" style={{ marginInline: 'auto' }}>
      <DraftNotice approved={entry.approved} label={DRAFT_LABEL} />

      <p
        className="t-micro"
        style={{ color: 'var(--muted)', margin: '0 0 1.25rem' }}
      >
        {entry.date} · {KIND_LABELS[entry.kind]}
      </p>

      <h1 className="t-display" style={{ margin: '0 0 2.5rem' }}>
        {entry.title}
      </h1>

      <div
        className="prose t-small"
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />

      <p className="t-small" style={{ margin: '4.5rem 0 0' }}>
        <Link href="/reservoir">← The Reservoir</Link>
      </p>
    </article>
  )
}
