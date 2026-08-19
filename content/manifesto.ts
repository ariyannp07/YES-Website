/**
 * The manifesto.
 *
 * OWNER-WRITTEN. This is Ariyan and Sofia's own text, supplied verbatim — not
 * an agent draft. `approved` is therefore true and the page carries no draft
 * mark. Nothing here should be rewritten, tightened or "improved" without them;
 * per the human/AI policy, creative direction on this page is human.
 *
 * Transcribed exactly as given, including its em dashes and curly apostrophes.
 * Earlier drafts preserved the speech's unspaced en dash per canon 03 §2.4;
 * the owners' own punctuation supersedes that open question.
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
  /** Consecutive lines set tight — here, the three questions. */
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
      text: 'We are Ariyan Patel and Sofia Teifeld, the newest co-presidents of the Yale Entrepreneurial Society.',
    },
    {
      kind: 'paragraph',
      text: 'All you need to know about us is that we’re committed to building a home on campus for the Yalie who is relentlessly curious about the people and problems around them, creative in the solutions they generate, and ruthless in their conviction and commitment to their vision and its prospective impact on the world. In essence, a home for Yalies who want to change the status quo.',
    },
    {
      kind: 'paragraph',
      text: 'Our institution has long stood as the factory of the future. From Nobel laureates to presidents, Yale’s legacy has been shaped by people in whom its education helped inseminate visions that moved the world forward.',
    },
    {
      kind: 'turn',
      text: 'Yet today, Yale lags.',
    },
    {
      kind: 'paragraph',
      text: 'We see that now, more than ever, a student whose humanity pushes them to see the issues around them, whose creativity inspires them with true innovation, and whose excellence renders them an ability to act can change the world.',
    },
    {
      kind: 'paragraph',
      text: 'Yalies do not lack technical ability or humanity. In fact, they are some of the things we are best at. We are lacking, however, in a tendency to create.',
    },
    {
      kind: 'paragraph',
      text: 'Every day, we see some of the sharpest and most inspired minds around us in the world commit themselves to corporations where the value they create does not reach 99 percent of society.',
    },
    {
      kind: 'paragraph',
      text: 'This is because we, as the Yale entrepreneurial community, have failed to show just how sustainable and imperative it is that every Yalie faces the same question:',
    },
    {
      kind: 'turn',
      text: 'What if?',
    },
    {
      kind: 'stack',
      lines: [
        'What if I stopped trying to recruit?',
        'What if the hypothetical scenario were something real and attainable?',
        'What if I built it instead of just wondering why it does not already exist?',
      ],
    },
    {
      kind: 'paragraph',
      text: 'This, what if, is the core question that we—the builders at the Yale Entrepreneurial Society—wake up and ask ourselves each day.',
    },
    {
      kind: 'paragraph',
      text: 'Our job: teach the most genuine and talented students in the world to ask it too.',
    },
    {
      kind: 'paragraph',
      text: 'This summer, for the first time in Yale’s history, and without any funding from Yale, YES brought 14 teams together in a house in San Francisco with one goal:',
    },
    {
      kind: 'turn',
      text: 'Build.',
    },
    {
      kind: 'paragraph',
      text: 'Four teams have already completed fundraising rounds totaling $17 million.',
    },
    {
      kind: 'paragraph',
      text: 'They are building across biotechnology, robotics, spacetech, assistive technology, financial infrastructure, legal and land-use systems, artificial intelligence, and other frontier industries.',
    },
    {
      kind: 'paragraph',
      text: 'Their work has attracted some of the world’s leading investors and received national recognition from The Wall Street Journal.',
    },
    {
      kind: 'paragraph',
      text: 'And that was in just one summer of actually having a home to rally around.',
    },
    {
      kind: 'paragraph',
      text: 'The Hacker House did not create Yale’s talent; it showed what happens when that talent is finally brought together.',
    },
    {
      kind: 'paragraph',
      text: 'Yale builders have already built an emergency-response platform protecting approximately 100 million Americans before selling it for more than $600 million.',
    },
    {
      kind: 'paragraph',
      text: 'We have spent years iterating on real-time captioning glasses, built technology to support the next generation of robots and satellites, commercialized Yale research, and created new infrastructure for biological research, financial institutions, and cities.',
    },
    {
      kind: 'paragraph',
      text: 'We have done all of this while largely being left to figure things out on our own.',
    },
    {
      kind: 'paragraph',
      text: 'Imagine what the Yale builder community could look like if we eliminated the handicap.',
    },
    {
      kind: 'paragraph',
      text: 'What if a technical Yalie had the same resources they would at MIT, Harvard, Princeton, or Stanford?',
    },
    {
      kind: 'paragraph',
      text: 'This is YES’s central goal: create a world-class place for us to find one another, build together, access advice and capital, recruit talent, and pursue our work with the seriousness it deserves.',
    },
    {
      kind: 'paragraph',
      text: 'And not on the off chance that we might cultivate the next unicorn founder. Because they are already here and they are struggling to succeed because we are failing to support them.',
    },
    {
      kind: 'paragraph',
      text: 'So if you’re the kind of person who thinks they have what it takes to work on something meaningful, we’re the people who want to help you do it.',
    },
    {
      kind: 'paragraph',
      text: 'And if Yale intends to remain the factory of the future, we, YES, will ensure that its students learn not only to study that future, but to build it.',
    },
  ],
}
