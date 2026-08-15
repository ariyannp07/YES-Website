import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Dossier } from '@/components/alumni/dossier'
import { allAlumni, alumnusBySlug } from '@/lib/alumni'

/**
 * Dossier expansion pattern B — the full-page takeover.
 *
 * Server-rendered at a stable URL so a dossier can be linked directly in
 * outreach and press (build spec §3, "dossier content server-rendered for
 * shareability"). This is also what a cold load of an intercepted route falls
 * back to, which is why the interaction needs no JavaScript to be shareable.
 */
export const dynamic = 'force-static'

export async function generateStaticParams() {
  const people = await allAlumni()
  return people.map((person) => ({ slug: person.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const person = await alumnusBySlug(slug)

  if (!person || person.placeholder) return { title: 'Catalog' }

  return {
    title: person.name,
    description: person.nowLine,
  }
}

export default async function AlumnusPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const person = await alumnusBySlug(slug)

  if (!person) notFound()

  return (
    <article className="page-top" style={{ marginInline: 'auto', maxWidth: 'var(--measure)' }}>
      <Dossier person={person} />

      <p className="t-small" style={{ margin: '4.5rem 0 0' }}>
        <Link href="/catalog">← Catalog</Link>
      </p>
    </article>
  )
}
