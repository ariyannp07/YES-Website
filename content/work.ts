/**
 * The four initiatives and the proof block.
 *
 * DRAFT — AWAITING OWNER APPROVAL, but the descriptions below are taken
 * VERBATIM from canon/01-vision-brief.md → "The Four Initiatives", and the
 * proof figures verbatim from → "PROOF OF POTENTIAL". Build spec §3 requires
 * the /work copy be drawn from the brief's descriptions and §8.5 forbids
 * inventing anything. Nothing here is paraphrased.
 *
 * The Residency is deliberately absent: the delivered speech says "four core
 * initiatives" and the four-initiative brief is canonical. See
 * canon/01-vision-brief.md → Appendix A, and Boola's airtable/schema.ts, which
 * seeds the same four Programs.
 */

export interface Initiative {
  readonly index: string
  readonly name: string
  readonly body: string
}

export const INITIATIVES: readonly Initiative[] = [
  {
    index: '01',
    name: 'Special Projects',
    body: 'Students learn to build before they necessarily have an idea of their own. High-agency teams will work on internally incubated concepts and scoped projects with established companies, including work being explored with Zipline around high-volume drone-delivery operations and a campus pilot with a student financial-services company.',
  },
  {
    index: '02',
    name: 'The Fellowship',
    body: 'A tap-only, six-month cohort for 15–20 exceptional creative problem-solvers. Fellows will gain sustained exposure to founders and operators, build alongside one another, and shadow teams at leading unicorn, frontier, and deep-tech companies.',
  },
  {
    index: '03',
    name: 'BASYES',
    body: 'Building and Scaling Yalie Startups. A focused accelerator for five to eight of Yale’s strongest founding teams, targeting a $10,000 investment per team alongside startup credits, mentorship, accountability, and direct access to investors and alumni. The program will culminate in a demo day, with curriculum development informed by the founder of Floodgate and additional operators.',
  },
  {
    index: '04',
    name: 'A Permanent Home—or Homes',
    body: 'The San Francisco Hacker House will return as a larger residential building program. In New Haven, YES will pursue a permanent space where builders can work, host events, hold office hours, and find one another throughout the year.',
  },
] as const

/**
 * Proof. Numbers in display type, context in small type, no animated counters
 * (build spec §3 and the §1 anti-pattern list).
 */
export interface ProofItem {
  readonly figure: string
  readonly context: string
}

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

export const PROOF_CLOSE =
  'The Hacker House did not create Yale’s talent. It showed what happens when that talent is given a home.'

/** Both /work blocks ship as drafts until the owners sign off (build spec §8.4). */
export const WORK_APPROVED = false
export const WORK_DRAFT_LABEL = 'DRAFT — AWAITING OWNER APPROVAL'
