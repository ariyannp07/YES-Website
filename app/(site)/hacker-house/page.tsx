import type { Metadata } from 'next'

import { DraftNotice } from '@/components/draft-notice'
import GlobeCanvas from '@/components/landing/globe/globe-canvas'
import {
  HOUSE_APPROVED,
  HOUSE_DRAFT_LABEL,
  HOUSE_FIGURES,
  HOUSE_PHOTOS,
} from '@/content/hacker-house'

import styles from './hacker-house.module.css'

export const metadata: Metadata = {
  title: 'Hacker House',
  description:
    'The first Yale Hacker House: fourteen teams, one summer in San Francisco.',
}

const WSJ_URL =
  'https://www.wsj.com/tech/ai/forget-wall-street-elite-students-are-spending-their-summers-on-startup-dreams-e7191994'

/**
 * The globe lives here now.
 *
 * It draws exactly one route — New Haven to San Francisco — which was the
 * landing's backdrop and is this page's subject. See components/landing/
 * home-page.tsx for why it could not stay on both.
 */
export default function HackerHousePage() {
  return (
    <div className={styles.page}>
      <DraftNotice approved={HOUSE_APPROVED} label={HOUSE_DRAFT_LABEL} />

      <h1 className={styles.heading}>Hacker House</h1>
      <p className={styles.standfirst}>
        Fourteen Yale teams spent the summer of 2026 in one house in San Francisco,
        building.
      </p>

      <div className={styles.globePanel}>
        <GlobeCanvas />
      </div>

      <figure className={styles.triptych}>
        <div className={styles.frames}>
          {HOUSE_PHOTOS.map((photo) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
            />
          ))}
        </div>
        {/* One credit for the set: all three are the same publication's. */}
        <figcaption>
          Photographs: {HOUSE_PHOTOS[0].credit}
        </figcaption>
      </figure>

      <div className={styles.figures}>
        {HOUSE_FIGURES.map((item) => (
          <div key={item.figure} className={styles.figure}>
            <strong>{item.figure}</strong>
            <span>{item.context}</span>
          </div>
        ))}
      </div>

      <div className={styles.clipping}>
        <div className={styles.clippingBody}>
          <p>
            The Wall Street Journal came to the house and wrote about what elite
            students are doing with their summers now.
          </p>
          <a
            className={styles.read}
            href={WSJ_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            Read the article ↗
          </a>
        </div>
      </div>
    </div>
  )
}
