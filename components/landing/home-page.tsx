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
 * The statement types in word bursts, pauses before punctuation, and keeps
 * its layout reserved. Reduced motion reveals the complete line immediately.
 */
const CHARACTER_BURST_MS = 48
const WORD_PAUSE_MS = 280
const PERIOD_PAUSE_MS = 750
const CHARACTER_LEAD_IN_MS = 350

export function HomePage() {
  const statement = YES_MESSAGE.join(' ')
  let nextCharacterAt = CHARACTER_LEAD_IN_MS

  return (
    <div className={styles.page}>
      <section className={styles.launch} aria-labelledby="launch-title">
        <div className={styles.launchInner}>
          <div className={styles.launchStatement} data-landing-copy="">
            <h1 id="launch-title" aria-label={statement}>
              {YES_MESSAGE.map((sentence) => {
                return (
                  <span key={sentence} className={styles.launchLine} aria-hidden="true">
                    {sentence.split(' ').map((word, wordIndex) => (
                      <span key={`${word}-${wordIndex}`} className={styles.launchWord}>
                        {Array.from(word).map((character, characterIndex) => {
                          const delay = nextCharacterAt
                          const lastInWord = characterIndex === word.length - 1
                          const lastInSentence = lastInWord && wordIndex === sentence.split(' ').length - 1
                          const hold = lastInSentence
                            ? 1400
                            : word[characterIndex + 1] === '.'
                              ? PERIOD_PAUSE_MS
                              : lastInWord
                                ? WORD_PAUSE_MS + (wordIndex % 3) * 70
                                : CHARACTER_BURST_MS + (characterIndex % 3) * 12
                          nextCharacterAt += hold

                          return (
                            <span
                              key={`${character}-${characterIndex}`}
                              className={styles.launchCharacter}
                              style={
                                {
                                  '--character-delay': `${delay}ms`,
                                  '--cursor-hold': `${hold}ms`,
                                } as CSSProperties
                              }
                            >
                              <span className={character === '.' ? styles.launchPeriod : undefined}>
                                {character}
                              </span>
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
