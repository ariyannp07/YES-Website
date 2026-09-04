import { notFound } from 'next/navigation'

import { Dossier } from '@/components/alumni/dossier'
import { DossierModal } from '@/components/alumni/dossier-modal'
import { alumnusBySlug, profileAlumni } from '@/lib/alumni'

/**
 * Prerendered like the standalone page. Without this the intercepted route is
 * rendered on demand, which would put a live Airtable read behind every click
 * on a face — and would let a newly consented person appear without a deploy.
 * Canon 05-human-ai-policy R1 again.
 */
export const dynamic = 'force-static'

export async function generateStaticParams() {
  const people = await profileAlumni()
  return people.map((person) => ({ slug: person.slug }))
}

/**
 * The intercepted route: clicking a face from the mosaic expands its dossier
 * over the wall instead of navigating away. Same content, same component, same
 * URL as the standalone page — so Back, Forward and link-sharing all work
 * without any extra state.
 */
export default async function InterceptedDossier({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const person = await alumnusBySlug(slug)

  if (!person) notFound()

  return (
    <DossierModal slug={slug}>
      <Dossier person={person} />
    </DossierModal>
  )
}
