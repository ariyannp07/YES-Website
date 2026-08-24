import Link from 'next/link'

import { LandingStage } from '@/components/landing/globe/landing-stage'
import { TypedLine } from '@/components/landing/globe/typed-line'
import styles from '@/components/landing/globe/globe.module.css'
import { Timestamp } from '@/components/timestamp'
import { LANDING_LINE, LANDING_LINKS, SITE_NAME } from '@/lib/site'
import { TIMING, typingDuration } from '@/lib/landing/timing'

/**
 * The front door.
 *
 * Darkness, then a network Earth assembling itself region by region, then a
 * white ignition from New Haven, and only then the words — the organisation,
 * the thesis, the way in. The argument is made by the picture before it is made
 * in type: a global network whose origin point is here.
 *
 * There is no scroll; the page is the viewport (build spec §3). The globe can
 * be spun on any axis, so the last state is the visitor's, not ours.
 *
 * All pacing lives in lib/landing/timing.ts. The copy is server-rendered in
 * full and merely revealed by the client, so the page says what it says with
 * JavaScript off and reads correctly to a screen reader from the first frame.
 */

const TITLE_DONE = TIMING.title.at + typingDuration(SITE_NAME, TIMING.title.cps)
const MOTTO_AT = Math.max(TIMING.motto.at, TITLE_DONE + 0.25)

export default function Landing() {
  return (
    <div data-scope="landing" className={styles.stage}>
      <LandingStage>
      <header className={`${styles.masthead} t-micro`}>
        <Timestamp />
      </header>

      <div className={styles.copy} data-landing-copy="">
        <h1
          className={`${styles.title} ${styles.beat}`}
          style={{ animationDelay: `${TIMING.title.at}s` }}
        >
          <TypedLine text={SITE_NAME} at={TIMING.title.at} cps={TIMING.title.cps} />
        </h1>

        <p
          className={`${styles.motto} ${styles.beat}`}
          style={{ animationDelay: `${MOTTO_AT}s` }}
        >
          <TypedLine text={LANDING_LINE} at={MOTTO_AT} cps={TIMING.motto.cps} />
        </p>

        <p
          className={`${styles.enter} ${styles.beat} t-micro`}
          style={{ animationDelay: `${TIMING.link.at}s` }}
        >
          {LANDING_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </p>
      </div>

      <p className={`${styles.footnote} t-micro`}>Since 1999</p>
      </LandingStage>
    </div>
  )
}
