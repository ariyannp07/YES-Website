import type { CSSProperties } from 'react'

import { YES_MESSAGE } from '@/lib/site'
import { vcFirms } from '@/lib/vc-community'

import styles from './home.module.css'

const WSJ_URL =
  'https://www.wsj.com/tech/ai/forget-wall-street-elite-students-are-spending-their-summers-on-startup-dreams-e7191994'

/**
 * The front door: a statement, a line of firms, one clipping.
 *
 * WHAT LEFT AND WHY. The stats block, the Thesis/People cards, the Common Room
 * teaser and the press list were removed at owner direction. They are reachable
 * from the header and nowhere else now, which is what makes NAV load-bearing —
 * see lib/site.ts, and lib/site.test.ts for the check that keeps it honest.
 *
 * The globe went to /hacker-house rather than being deleted. It draws exactly
 * one thing — the route from New Haven to San Francisco — which is the claim
 * the WSJ story already makes. Keeping both told one story twice on a page
 * whose whole point is saying one thing once.
 *
 * The statement is set at --text-body and unbold. It was display type until the
 * owners saw it that way and cut it down: at hero size the same words argue,
 * at body size they simply state, and the page carries them better.
 *
 * The row shows the whole roster. It used to show eight marks and hide thirty
 * names behind a disclosure; both the disclosure and the firms that had no mark
 * to show are gone, so what renders is the roster entire.
 *
 * The statement types once over about six seconds, with its full layout
 * reserved from the start and an instant reveal for reduced motion.
 */
const CHARACTER_STAGGER_MS = 110
const CHARACTER_LEAD_IN_MS = 350

export function HomePage() {
  const statement = YES_MESSAGE.join(' ')

  return (
    <div className={styles.page}>
      <section className={styles.launch} aria-labelledby="launch-title">
        <div className={styles.launchInner}>
          <div className={styles.launchStatement} data-landing-copy="">
            <h1 id="launch-title" aria-label={statement}>
              {YES_MESSAGE.map((sentence, sentenceIndex) => {
                const precedingCharacters = YES_MESSAGE.slice(0, sentenceIndex)
                  .join('')
                  .replace(/\s/g, '').length
                let seen = 0

                return (
                  <span key={sentence} className={styles.launchLine} aria-hidden="true">
                    {sentence.split(' ').map((word, wordIndex) => (
                      <span key={`${word}-${wordIndex}`} className={styles.launchWord}>
                        {Array.from(word).map((character, characterIndex) => {
                          const delay =
                            CHARACTER_LEAD_IN_MS +
                            (precedingCharacters + seen++) * CHARACTER_STAGGER_MS

                          return (
                            <span
                              key={`${character}-${characterIndex}`}
                              className={styles.launchCharacter}
                              style={
                                { '--character-delay': `${delay}ms` } as CSSProperties
                              }
                            >
                              {character}
                            </span>
                          )
                        })}
                      </span>
                    ))}
                  </span>
                )
              })}
            </h1>
          </div>

          <p className={styles.vcCaption}>
            Our community includes the following firms.
          </p>
          <ul className={styles.vcRow} aria-label="Firms in the YES community">
            {vcFirms.map((firm) => (
              <li key={firm.name} className={firm.reversed ? styles.reversed : undefined}>
                <img
                  src={firm.logo}
                  alt={firm.name}
                  width={firm.width}
                  height={firm.height}
                />
              </li>
            ))}
          </ul>

          <a
            className={styles.storyHook}
            href={WSJ_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className={styles.storyKicker}>Featured story</span>
            <span className={styles.publication}>The Wall Street Journal.</span>
            <span className={styles.storyRule} />
            <strong>
              Forget Wall Street. Elite Students Are Spending Their Summers on Startup
              Dreams.
            </strong>
            <span className={styles.storyAction}>Read the article ↗</span>
          </a>
        </div>
      </section>
    </div>
  )
}
