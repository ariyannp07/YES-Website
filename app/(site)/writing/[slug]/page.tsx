import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { DraftNotice } from '@/components/draft-notice'
import { allEssays, essayBySlug } from '@/lib/writing'

const DRAFT_LABEL = 'DRAFT — AWAITING OWNER APPROVAL'

export function generateStaticParams() {
  return allEssays().map((essay) => ({ slug: essay.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const essay = essayBySlug(slug)

  return essay ? { title: essay.title } : {}
}

export default async function EssayPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const essay = essayBySlug(slug)

  if (!essay) notFound()

  return (
    <article className="measure page-top" style={{ marginInline: 'auto' }}>
      <DraftNotice approved={essay.approved} label={DRAFT_LABEL} />

      <p className="t-micro" style={{ color: 'var(--muted)', margin: '0 0 1.25rem' }}>
        {essay.date}
      </p>

      <h1 className="t-display" style={{ margin: '0 0 2.5rem' }}>
        {essay.title}
      </h1>

      <div
        className="prose t-small"
        dangerouslySetInnerHTML={{ __html: essay.html }}
      />

      <p className="t-small" style={{ margin: '4.5rem 0 0' }}>
        <Link href="/writing">← Writing</Link>
      </p>
    </article>
  )
}
