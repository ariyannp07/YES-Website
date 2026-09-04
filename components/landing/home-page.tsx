import type { CSSProperties } from 'react'
import Link from 'next/link'

import { ProfileImage } from '@/components/catalog/profile-image'
import GlobeCanvas from '@/components/landing/globe/globe-canvas'
import { allAlumni } from '@/lib/alumni'
import { allEntries } from '@/lib/reservoir'

import styles from './home.module.css'

const WSJ_URL =
  'https://www.wsj.com/tech/ai/forget-wall-street-elite-students-are-spending-their-summers-on-startup-dreams-e7191994'

const LAUNCH_TITLE = 'The next Yale company is a conversation that hasn’t happened yet.'
const LAUNCH_WORDS = LAUNCH_TITLE.split(' ')

export async function HomePage() {
  const people = await allAlumni()
  const faces = people
    .filter(
      (person) => person.directoryStatus !== 'uncertain' && person.portraitColor,
    )
    .slice(0, 9)
  const press = allEntries().filter((entry) => entry.kind === 'press')

  return (
    <div className={styles.page}>
      <section className={styles.launch} aria-labelledby="launch-title">
        <div className={styles.launchInner}>
          <div className={styles.launchStatement} data-landing-copy="">
            <h1 id="launch-title" aria-label={LAUNCH_TITLE}>
              {LAUNCH_WORDS.map((word, wordIndex) => {
                const precedingCharacters = LAUNCH_WORDS.slice(0, wordIndex).join('').length

                return (
                  <span key={word} className={styles.launchWord} aria-hidden="true">
                    {Array.from(word).map((character, characterIndex) => (
                      <span
                        key={`${character}-${characterIndex}`}
                        className={styles.launchCharacter}
                        style={
                          {
                            '--character-delay': `${70 + (precedingCharacters + characterIndex) * 18}ms`,
                          } as CSSProperties
                        }
                      >
                        {character}
                      </span>
                    ))}
                  </span>
                )
              })}
            </h1>
          </div>

          <div className={styles.globePanel}>
            <GlobeCanvas />
          </div>

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

        <a href="#proof" className={styles.scrollCue} aria-label="Scroll to explore YES">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 9 7 7 7-7" />
          </svg>
        </a>
      </section>

      <section id="proof" className={styles.statsSection} aria-label="YES at a glance">
        <p className={styles.intro}>
          YES is Yale’s student-run network for students building companies or exploring
          entrepreneurship. We connect members with peers, founders, operators, and
          investors through events, programs, and direct introductions. Members get
          practical feedback, access to talent and capital, and support from first idea
          through growth.
        </p>

        <div className={styles.primaryStat}>
          <strong>$17,000,000+</strong>
          <span>Raised in the past year by YES founders</span>
        </div>
        <div className={styles.secondaryStats}>
          <div>
            <strong>14</strong>
            <span>teams at the first Yale Hacker House</span>
          </div>
          <div>
            <strong>$200M+</strong>
            <span>valuation of YES-associated companies</span>
          </div>
        </div>
      </section>

      <section className={styles.choiceWrap}>
        <nav className={styles.choiceSection} aria-label="Explore YES">
          <a href="/thesis" className={`${styles.choice} ${styles.thesisChoice}`}>
            <span className={styles.choiceLabel}>Thesis</span>
            <div className={styles.paperPreview} aria-hidden="true">
              <span className={styles.paperTitle}>The YES Thesis</span>
              <span className={styles.paperDivider} />
              <strong>Creation should be a part of a Yale education.</strong>
            </div>
          </a>
          <Link href="/catalog" className={`${styles.choice} ${styles.peopleChoice}`}>
            <span className={styles.choiceLabel}>People</span>
            <div className={styles.faceField} aria-hidden="true">
              {faces.map((person) => (
                <ProfileImage
                  key={person.slug}
                  name={person.name}
                  photo={person.portraitColor}
                  className={styles.choiceFace}
                />
              ))}
            </div>
          </Link>
        </nav>
      </section>

      <section className={styles.commonRoomSection}>
        <div>
          <span className="status-pending">Pending</span>
          <h2>Common Room</h2>
          <p>
            A uniquely Yale community of the university’s most ambitious builders and
            innovators.
          </p>
        </div>
        <Link href="/common-room">Details to come →</Link>
      </section>

      <section id="press" className={styles.pressSection}>
        <h2 className={styles.pressHeading}>Press</h2>

        <div className={styles.pressList}>
          {press.map((entry) => (
            <a
              key={entry.slug}
              href={entry.url}
              className={styles.pressRow}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span>{entry.date}</span>
              <strong>{entry.title}</strong>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
