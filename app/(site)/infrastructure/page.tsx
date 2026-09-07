import type { Metadata } from 'next'
import Link from 'next/link'

import {
  HACKER_HOUSE_SUPPORT,
  INFRASTRUCTURE_LEAD,
  PILLARS,
} from '@/content/infrastructure'

import styles from './infrastructure.module.css'

export const metadata: Metadata = {
  title: 'Infrastructure',
  description:
    'What the Yale Entrepreneurial Society gives a builder: a community, a society, a summer in San Francisco, and a room in New Haven.',
}

/**
 * The four parts, in the owners' order, alternating text and photograph.
 *
 * Common Room and SF Hacker House carry an `href`: their headings link to the
 * fuller pages rather than this one repeating them. YES and the New Haven House
 * have no page of their own, which is part of why this route exists.
 */
export default function InfrastructurePage() {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <h1>Infrastructure</h1>
        <p>{INFRASTRUCTURE_LEAD}</p>
      </header>

      {PILLARS.map((pillar) => (
        <section key={pillar.slug} className={styles.pillar} aria-labelledby={pillar.slug}>
          <div className={styles.copy}>
            <h2 id={pillar.slug} className={styles.name}>
              {pillar.href ? <Link href={pillar.href}>{pillar.name}</Link> : pillar.name}
            </h2>

            {pillar.figure ? (
              <p className={styles.figure}>
                <strong>{pillar.figure.value}</strong>
                <span>{pillar.figure.label}</span>
              </p>
            ) : null}

            {pillar.body.map((line) => (
              <p key={line} className={styles.line}>
                {line}
              </p>
            ))}

            {pillar.href ? (
              <Link className={styles.more} href={pillar.href}>
                More ↗
              </Link>
            ) : null}
          </div>

          <figure className={styles.plate}>
            <img
              src={pillar.image}
              alt={pillar.alt}
              width={pillar.width}
              height={pillar.height}
              loading="lazy"
            />
            {pillar.credit ? <figcaption>{pillar.credit}</figcaption> : null}
          </figure>
        </section>
      ))}

      <p className={styles.support}>{HACKER_HOUSE_SUPPORT}</p>
    </div>
  )
}
