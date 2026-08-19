/**
 * /work — the proof.
 *
 * The four initiatives (Special Projects, The Fellowship, BASYES, A Permanent
 * Home—or Homes) were removed at owner direction. The page is now the numbers
 * and nothing else. Build spec §3 describes /work as a numbered index of the
 * initiatives followed by a proof block; only the second half survives.
 *
 * Their descriptions are still in git — restoring them is a revert of the
 * commit that removed them, not a rewrite. canon/01-vision-brief.md remains the
 * source of truth for what the programmes are.
 *
 * Every figure below is verbatim from canon/01-vision-brief.md → "PROOF OF
 * POTENTIAL". Nothing here is invented (build spec §8.5).
 */

export interface ProofItem {
  readonly figure: string
  readonly context: string
}

/**
 * Numbers in display type, context in small type, no animated counters
 * (build spec §3 and the §1 anti-pattern list).
 *
 * NOTE — the second line says FIVE teams. The owner-written manifesto says
 * FOUR. Both are live, one click apart. Flagged in README under open decisions
 * and deliberately not reconciled here: picking one would mean overruling
 * either the canon or the owners on their own copy.
 */
export const PROOF: readonly ProofItem[] = [
  {
    figure: '14',
    context:
      'teams brought together in San Francisco this summer for the first Yale Hacker House.',
  },
  {
    figure: '$17M+',
    context:
      'raised by five of those teams already, across biotechnology, robotics, spacetech, assistive technology, financial infrastructure, and AI-native legal and land-use systems — with work receiving national recognition from The Wall Street Journal.',
  },
  {
    figure: '$600M+',
    context:
      'the acquisition of Prepared, an emergency-response platform built by Yalies, after reaching roughly 100 million Americans.',
  },
  {
    figure: '$3.3B',
    context:
      'the valuation of Spring Health, started at Yale by April Koh ’16 and Adam Chekroud GRD ’18, now serving 20 million people.',
  },
] as const

/** The context lines are agent-written, so the page still ships as a draft. */
export const WORK_APPROVED = false
export const WORK_DRAFT_LABEL = 'DRAFT — AWAITING OWNER APPROVAL'
