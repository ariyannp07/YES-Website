import { z } from 'zod'

/**
 * The alumni mosaic's data (build spec §3, /alumni).
 *
 * CONSENT GATE. Every person on this page requires explicit opt-in covering
 * headshot, dossier content and links. The page reads only the Airtable
 * `Alumni-Page-Feed` view, which filters on `alumni_page_ok` — mirroring the
 * Public-Catalog-Feed pattern and canon 05-human-ai-policy R3. Records are
 * excluded from the payload entirely rather than emitted with nulls, and the
 * field list below is an explicit allowlist, never "all fields except".
 *
 * Until the feed is configured the mosaic renders placeholder silhouettes. They
 * are visibly unnamed and every dossier field reads [TBD — owner input], so a
 * placeholder can never be mistaken for a real person.
 */

export const PROOF_KINDS = ['number', 'headline', 'image', 'link'] as const

export const ProofObject = z.object({
  kind: z.enum(PROOF_KINDS),
  /** The artifact itself: "$600M+", a headline, an image path, a demo URL. */
  value: z.string().min(1),
  /** Where it came from — publication, filing, the alum's own submission. */
  source: z.string().optional(),
})

export type ProofObject = z.infer<typeof ProofObject>

export const Alumnus = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  classYear: z.string().min(1),
  /** One line of what they are doing now. */
  nowLine: z.string().min(1),
  proof: ProofObject,
  /** Collected from them, never ghost-written (build spec §3). */
  ownWords: z.string().optional(),
  portraitDuotone: z.string().optional(),
  portraitColor: z.string().optional(),
  companyUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  /**
   * Hierarchy by gravity, never by rank. A heavier tile is larger so the eye
   * lands on the strongest proof first. No "Featured" header, no ordering
   * labels, no cohort groupings — the hierarchy is whispered, not announced.
   */
  weight: z.union([z.literal(1), z.literal(2)]).default(1),
  placeholder: z.boolean().default(false),
})

export type Alumnus = z.infer<typeof Alumnus>

export const TBD = '[TBD — owner input]'

const PLACEHOLDER_COUNT = 24

/**
 * Every head is the same size, at the owners' direction — the spec's
 * "hierarchy by gravity" tile weighting is not in play. `weight` stays in the
 * schema so the idea can be switched back on without a data migration.
 */
export const placeholderAlumni = (): readonly Alumnus[] =>
  Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => ({
    slug: `placeholder-${String(index + 1).padStart(2, '0')}`,
    name: TBD,
    classYear: TBD,
    nowLine: TBD,
    proof: { kind: 'number', value: TBD },
    weight: 1,
    placeholder: true,
  }))

/**
 * True once the Airtable feed is configured. Kept as a single predicate so no
 * page has to guess what "connected" means.
 */
export const alumniFeedConfigured = (): boolean =>
  Boolean(process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID)

/**
 * The mosaic's source of truth, read at BUILD time.
 *
 * With no credentials this returns placeholder silhouettes rather than an empty
 * wall or fabricated people. With credentials it reads the consent-gated
 * Alumni-Page-Feed view and nothing else.
 */
export const allAlumni = async (): Promise<readonly Alumnus[]> => {
  if (!alumniFeedConfigured()) return placeholderAlumni()

  const { fetchAlumniFeed } = await import('@/lib/airtable/alumni-feed')
  const feed = await fetchAlumniFeed()

  // null means the consent-gated view has not been created yet — setup is not
  // finished, so the wall keeps its placeholders. An empty array means the view
  // exists and nobody has consented, and an empty wall is then the honest state.
  return feed ?? placeholderAlumni()
}

export const alumnusBySlug = async (
  slug: string,
): Promise<Alumnus | undefined> =>
  (await allAlumni()).find((person) => person.slug === slug)
