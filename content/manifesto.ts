/**
 * The manifesto.
 *
 * DRAFT — AWAITING OWNER APPROVAL. Build spec §5 and §8.4: the agent drafts,
 * the owners rewrite in their own hands. This is a starting point, not copy.
 * Flip `approved` to true only after Ariyan and Sofia have signed off; the page
 * shows a draft notice until then.
 *
 * Sourcing. Every fact traces to canon/01-vision-brief.md; every construction
 * traces to canon/03-brand-voice.md. Nothing is invented (build spec §8.5).
 *   · "factory of the future"        — canon 03 §1.4, canonical phrase
 *   · "Yet today, Yale lags."        — canon 02, the §2.1 turn, used ONCE
 *   · density/infrastructure         — canon 01, THE OPPORTUNITY
 *   · the 99 percent line            — canon 02
 *   · the three "what if" questions  — canon 02, verbatim; §3.2 stack, used ONCE
 *   · 14 teams / $17M / WSJ          — canon 01, PROOF OF POTENTIAL
 *   · Prepared, Spring Health, Koh, Chekroud — canon 01, PROOF OF POTENTIAL
 *   · MIT/Harvard/Princeton/Stanford — canon 02, §1.5 naming peers
 *   · the identity triad             — canon 02, verbatim; canon 03 §3.3
 *   · the four "Every" lines         — canon 01, THE STANDARD, verbatim
 *   · the closing line               — canon 01, verbatim
 *
 * Register: speech (first person plural, direct). Per canon 03 §2.4 the
 * unspaced en dash is a voice signal and is preserved rather than normalised to
 * an em dash. Canon 03 §7 carries that as an open owner decision — if the
 * owners want `—` instead, it is a find-and-replace in this file only.
 */

export type Block =
  | { readonly kind: 'paragraph'; readonly text: string }
  /** The §2.1 turn: one short declarative alone in its own paragraph. Once. */
  | { readonly kind: 'turn'; readonly text: string }
  /** The four "Every" lines from the brief, set as anaphora. */
  | { readonly kind: 'standard'; readonly lines: readonly string[] }

export interface Manifesto {
  readonly approved: boolean
  readonly draftLabel: string
  readonly blocks: readonly Block[]
  readonly signature: readonly string[]
}

export const MANIFESTO: Manifesto = {
  approved: false,
  draftLabel: 'DRAFT — AWAITING OWNER APPROVAL',

  blocks: [
    {
      kind: 'paragraph',
      text: 'Yale has long stood as the factory of the future. From Nobel laureates to presidents, its legacy has been shaped by people whose visions moved the world forward. That legacy is not in question.',
    },
    {
      kind: 'turn',
      text: 'Yet today, Yale lags.',
    },
    {
      kind: 'paragraph',
      text: 'Not for lack of talent. Yale does not have a talent problem–it has a density and infrastructure problem. The builders are already here, working alone. A student whose humanity pushes them to see the issues around them, whose creativity inspires true innovation, and whose excellence renders them an ability to act can change the world. And every year, some of the sharpest and most inspired students anywhere commit themselves instead to corporations where the value they create does not reach 99 percent of society.',
    },
    {
      kind: 'paragraph',
      text: 'That is not their failure. It is ours. We, as the Yale entrepreneurial community, have failed to show every Yalie just how imperative it is to ask: what if?',
    },
    {
      kind: 'paragraph',
      text: 'What if I stopped trying to recruit? What if the hypothetical became something real and attainable? What if I built it instead of just wondering why it doesn’t already exist?',
    },
    {
      kind: 'paragraph',
      text: 'This summer, for the first time in Yale’s history, YES brought 14 teams together in a house in San Francisco with one goal: build. Five have already raised more than $17 million combined, across biotechnology, robotics, spacetech, assistive technology, financial infrastructure, and AI-native legal and land-use systems–work that has drawn national recognition from The Wall Street Journal.',
    },
    {
      kind: 'paragraph',
      text: 'The Hacker House did not create Yale’s talent. It showed what happens when that talent is given a home.',
    },
    {
      kind: 'paragraph',
      text: 'And the proof is older than one summer. Yalies built Prepared, an emergency-response platform acquired for more than $600 million after reaching roughly 100 million Americans. April Koh ’16 and Adam Chekroud GRD ’18 started Spring Health at Yale; it is now valued at $3.3 billion and serves 20 million people. Others have developed real-time captioning glasses, commercialized Yale research, and created new infrastructure for robotics, satellites, biological research, financial institutions, and cities. They did it largely on their own.',
    },
    {
      kind: 'paragraph',
      text: 'So the question was never whether Yale produces builders. It is what happens when they stop having to do it alone. What if a technical Yalie had the same resources they would at MIT, Harvard, Princeton, or Stanford?',
    },
    {
      kind: 'paragraph',
      text: 'YES is the home for the Yalie who is relentlessly curious about the people and problems around them, creative in the solutions they generate, and ruthless in their conviction and commitment to their vision. We find builders working in isolation, put them in one room, and give them the experiences, relationships, capital, and physical space required to act.',
    },
    {
      kind: 'paragraph',
      text: 'We hold ourselves to a standard.',
    },
    {
      kind: 'standard',
      lines: [
        'Every curious student should see building as a path open to them.',
        'Every Yale builder should have a community to seek advice and spark new ideas.',
        'Every serious founding team should have what it needs to move faster.',
        'And YES should be the front door for every Yalie with the curiosity to question the status quo–and the conviction to build something better.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'If Yale intends to remain a factory of the future, its students must learn not only to study that future–but to build it.',
    },
  ],

  signature: ['Ariyan Patel and Sofia Teifeld', 'Co-Presidents, YES'],
}
