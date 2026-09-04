import curation from '../content/catalog/curation.json'
import directory from '../content/catalog/builders.json'
import portraitManifest from '../content/catalog/portraits.json'
import type { Alumnus } from './alumni'

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

type DirectoryStatus = 'board' | 'member' | 'former'

interface CuratedListing {
  readonly slug: string
  readonly name: string
  readonly sourceName?: string
  readonly status: DirectoryStatus
}

const DIRECTORY_ROLE: Readonly<Record<DirectoryStatus, string>> = {
  board: 'Member of Board',
  member: 'Member of YES',
  former: 'Former Board',
}

const PROOF_KINDS = new Set(['number', 'headline', 'image', 'link'])

/**
 * Portraits collected from public pages, keyed by slug.
 *
 * The manifest is the gate: a slug absent from it renders a monogram rather
 * than a broken image, so the wall degrades to initials one person at a time
 * instead of all at once. Every entry records the page it came from — see
 * content/catalog/portraits/SOURCES.csv — because these were gathered rather
 * than submitted, and anyone who asks to be removed should be removable in the
 * time it takes to delete a file.
 *
 * The derivatives themselves are built by scripts/build-portraits.mjs into
 * public/portraits/generated/, which is gitignored and rebuilt on every deploy.
 */
const portraits = portraitManifest.portraits as Record<string, unknown>

const hasPortrait = (slug: string): boolean =>
  Object.prototype.hasOwnProperty.call(portraits, slug)

const toAlumnus = (person: DirectoryPerson, directoryRole: string): Alumnus => ({
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
  portraitColor: hasPortrait(person.slug)
    ? `/portraits/generated/${person.slug}-color.webp`
    : undefined,
  portraitDuotone: hasPortrait(person.slug)
    ? `/portraits/generated/${person.slug}-duotone.webp`
    : undefined,
  companyUrl: person.companyUrl,
  linkedinUrl: person.linkedinUrl,
  weight: 1,
  placeholder: false,
  venture: person.venture,
  directoryRole,
  bio: person.bio,
  sectors: person.sectors ? [...person.sectors] : undefined,
  searchText: person.searchText,
  featured: person.featured ?? false,
  reviewNote: person.reviewNote,
})

const storedBySlug = new Map(
  (directory.people as readonly DirectoryPerson[]).map((person) => [person.slug, person]),
)

const minimalPerson = (listing: CuratedListing): DirectoryPerson => ({
  slug: listing.slug,
  name: listing.name,
  classYear: 'Yale',
  nowLine: DIRECTORY_ROLE[listing.status],
  searchText: '',
})

export const directoryPeople = (): readonly Alumnus[] =>
  (curation.people as readonly CuratedListing[]).map((listing) => {
    const stored = storedBySlug.get(listing.slug) ?? minimalPerson(listing)
    const directoryRole = DIRECTORY_ROLE[listing.status]

    return toAlumnus(
      {
        ...stored,
        name: listing.name,
        searchText: [
          listing.name,
          listing.sourceName,
          directoryRole,
          stored.searchText,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      },
      directoryRole,
    )
  })
