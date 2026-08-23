import type { Alumnus } from '@/lib/alumni'

/**
 * The canonical text that represents a builder in vector space.
 *
 * scripts/embed-catalog.ts bakes vectors with this function and the browser
 * embeds queries with the same model; if the two ever describe a person
 * differently the cosine scores stop meaning anything. Adapted from the
 * yes-catalog scaffold, whose warning applies verbatim: keep them in sync.
 *
 * Deliberately omits the review notes and any contact detail — the index
 * should rank people by what they build, not by internal bookkeeping.
 */
export const buildEmbedText = (person: Alumnus): string => {
  const parts = [
    person.name,
    person.venture ? `Builds ${person.venture}.` : '',
    person.nowLine,
    person.classYear ? `Yale class of ${person.classYear}.` : '',
    person.sectors?.length ? `Sectors: ${person.sectors.join(', ')}.` : '',
    person.bio ?? '',
  ]
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}
