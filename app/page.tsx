import Link from 'next/link'

import SignalCanvas from '@/components/landing/signal/signal-canvas'
import styles from '@/components/landing/signal/signal.module.css'
import { Timestamp } from '@/components/timestamp'
import { LANDING_LINE, LANDING_LINKS, SITE_NAME } from '@/lib/site'

/**
 * The front door.
 *
 * A hidden network, scanned with the cursor. The page opens on a single pulsing
 * point; moving the mouse exposes nodes and edges around it, and over ten
 * seconds an ambient floor rises so the field densifies on its own. Roughly half
 * the nodes are sampled from inside the YES mark's polygons and carry a higher
 * floor, so the shape surfaces as a DENSITY — the viewer half-recognises it
 * without a logo ever appearing. Disciplines occasionally collide and propose
 * something neither of them would have alone.
 *
 * There is no scroll: the whole page is the viewport (build spec §3). The
 * timestamp keeps its place as the site-wide signature.
 */
export default function Landing() {
  return (
    <>
      <SignalCanvas />

      {/* The name is already in the centre; the masthead keeps only the clock. */}
      <header className={`${styles.masthead} t-micro`}>
        <Timestamp />
      </header>

      <div className={styles.copy}>
        <p className={`${styles.name} t-micro`}>{SITE_NAME}</p>
        <p className={`${styles.tagline} t-micro`}>{LANDING_LINE}</p>
        <p className={`${styles.enter} t-micro`}>
          {LANDING_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </p>
      </div>

      {/* The tagline already carries the argument; this only carries the year. */}
      <p className={`${styles.footnote} t-micro`}>Since 1999</p>
    </>
  )
}
