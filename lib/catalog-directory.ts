import directory from '@/content/catalog/builders.json'
import type { Alumnus } from '@/lib/alumni'

/**
 * The owner-curated builder directory.
 *
 * Assembled from public professional sources and kept in git — deliberately NOT
 * behind the Airtable consent gates. Those flags mean "this person opted in",
 * and nobody here has; writing them through the gate would make the flag mean
 * "someone typed this in" instead. See scripts/import-catalog.mjs.
 *
 * Regenerate with: node scripts/import-catalog.mjs <path.csv>
 */

interface DirectoryPerson {
  readonly slug: string
  readonly name: string
  readonly classYear: string
  readonly school?: string
  readonly nowLine: string
  readonly venture?: string
  readonly bio?: string
  readonly sectors?: readonly string[]
  readonly proof?: { readonly kind: string; readonly value: string; readonly source?: string }
  readonly companyUrl?: string
  readonly linkedinUrl?: string
  readonly searchText: string
  readonly featured?: boolean
  readonly reviewNote?: string
}

const PROOF_KINDS = new Set(['number', 'headline', 'image', 'link'])

const toAlumnus = (person: DirectoryPerson): Alumnus => ({
  slug: person.slug,
  name: person.name,
  classYear: person.classYear,
  nowLine: person.nowLine,
  proof: {
    kind:
      person.proof && PROOF_KINDS.has(person.proof.kind)
        ? (person.proof.kind as Alumnus['proof']['kind'])
        : 'headline',
    value: person.proof?.value ?? person.venture ?? person.nowLine,
    source: person.proof?.source,
  },
  // Never ghost-written, so the directory never fills this in.
  ownWords: undefined,
  companyUrl: person.companyUrl,
  linkedinUrl: person.linkedinUrl,
  weight: 1,
  placeholder: false,
  venture: person.venture,
  bio: person.bio,
  sectors: person.sectors ? [...person.sectors] : undefined,
  searchText: person.searchText,
  featured: person.featured ?? false,
  reviewNote: person.reviewNote,
})

export const directoryPeople = (): readonly Alumnus[] =>
  (directory.people as readonly DirectoryPerson[]).map(toAlumnus)
