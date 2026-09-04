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

type ConfirmedDirectoryStatus = 'board' | 'member' | 'former'

interface CuratedListing {
  readonly slug: string
  readonly name: string
  readonly sourceName?: string
  readonly status: ConfirmedDirectoryStatus
}

const DIRECTORY_ROLE: Readonly<Record<ConfirmedDirectoryStatus, string>> = {
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

const toAlumnus = (
  person: DirectoryPerson,
  directoryRole: string,
  directoryStatus: Alumnus['directoryStatus'],
): Alumnus => ({
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
  directoryStatus,
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

const confirmedListings = curation.people as readonly CuratedListing[]
const confirmedSlugs = new Set(confirmedListings.map((listing) => listing.slug))
const YES_TITLE = /\bYES\b|Yale Entrepreneurial Society/i
const YES_OFFICER_CLAUSE = /\s*(?:,\s*|and\s+)?(?:co-)?founding officer of YES\b/gi

const externalDirectoryTitle = (title: string): string | undefined => {
  const externalParts = title
    .split(';')
    .map((part) => part.replace(YES_OFFICER_CLAUSE, '').trim())
    .filter((part) => part && !YES_TITLE.test(part))

  return externalParts.length > 0 ? externalParts.join('; ') : undefined
}

const toUncertainAlumnus = (
  person: Pick<DirectoryPerson, 'slug' | 'name' | 'nowLine'>,
): Alumnus => {
  const externalTitle = externalDirectoryTitle(person.nowLine)
  const portrait = hasPortrait(person.slug)

  return {
    slug: person.slug,
    name: person.name,
    classYear: 'Information uncertain',
    nowLine: externalTitle ?? 'Uncertain',
    proof: { kind: 'headline', value: 'Uncertain' },
    ...(portrait
      ? {
          portraitColor: `/portraits/generated/${person.slug}-color.webp`,
          portraitDuotone: `/portraits/generated/${person.slug}-duotone.webp`,
        }
      : {}),
    weight: 1,
    placeholder: false,
    directoryRole: 'Uncertain',
    directoryStatus: 'uncertain',
    searchText: [person.name, externalTitle, 'uncertain']
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }
}

const confirmedPeople = (): readonly Alumnus[] =>
  confirmedListings.map((listing) => {
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
      listing.status,
    )
  })

/**
 * Uncertain entries are intentionally reduced to identity and portrait only.
 * Their richer stored records stay available for later verification, but are
 * never serialized into the public page or its search index.
 */
const uncertainPeople = (): readonly Alumnus[] =>
  (directory.people as readonly DirectoryPerson[])
    .filter((person) => !confirmedSlugs.has(person.slug))
    .map(toUncertainAlumnus)

export const directoryPeople = (): readonly Alumnus[] => [
  ...confirmedPeople(),
  ...uncertainPeople(),
]
