/**
 * The manifesto.
 *
 * OWNER-WRITTEN. This is Ariyan and Sofia's own text, supplied verbatim — not
 * an agent draft. `approved` is therefore true and the page carries no draft
 * mark. Nothing here should be rewritten, tightened or "improved" without them;
 * per the human/AI policy, creative direction on this page is human.
 *
 * Transcribed exactly as given, preserving the owner's wording and punctuation.
 *
 * ONE FACT DISAGREES WITH THE REST OF THE SITE — see README, open decisions.
 * This text says FOUR teams completed rounds totalling $17 million.
 * canon/01-vision-brief.md and content/work.ts both say FIVE teams raised more
 * than $17 million combined. Both numbers are currently live on the site, one
 * page apart. Left exactly as written rather than silently reconciled.
 */

export type Block =
  | { readonly kind: 'paragraph'; readonly text: string }
  /** A single line standing alone, set in display type. The piece's beats. */
  | { readonly kind: 'turn'; readonly text: string }
  /** Consecutive lines set tight. */
  | { readonly kind: 'stack'; readonly lines: readonly string[] }

export interface Manifesto {
  readonly approved: boolean
  readonly draftLabel: string
  readonly blocks: readonly Block[]
}

export const MANIFESTO: Manifesto = {
  approved: true,
  draftLabel: 'DRAFT — AWAITING OWNER APPROVAL',

  blocks: [
    {
      kind: 'paragraph',
      text: 'This summer, without any funding from Yale, YES brought 14 teams together in a house in San Francisco.',
    },
    {
      kind: 'paragraph',
      text: 'Four teams completed fundraising rounds totaling $17 million. Their work spanned biotechnology, robotics, assistive technology, financial infrastructure, and other frontier industries, attracting leading investors and national recognition from The Wall Street Journal.',
    },
    {
      kind: 'paragraph',
      text: 'And that was one summer of having a home to rally around.',
    },
    {
      kind: 'paragraph',
      text: 'Building in the Hacker House showed us how much Yale’s builders could accomplish when they could find one another.',
    },
    {
      kind: 'paragraph',
      text: 'As the newest co-presidents of YES, we intend to bring that community home.',
    },
    {
      kind: 'paragraph',
      text: 'Our goal is to establish a permanent common room for the next generation of Yale visionaries to find one another, seek advice and resources, and pursue excellence in their work.',
    },
    {
      kind: 'paragraph',
      text: 'Our mission: support the Yalies who want to build the future, not just study for it.',
    },
  ],
}
