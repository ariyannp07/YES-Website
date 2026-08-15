import Link from 'next/link'

import { Atmosphere } from '@/components/field/atmosphere'
import { FloatingField } from '@/components/field/floating-field'
import { SpinningMark } from '@/components/field/spinning-mark'
import { Timestamp } from '@/components/timestamp'
import { FOUNDED_LINE, LANDING_LINKS, SITE_NAME } from '@/lib/site'

/**
 * The front door (build spec §3).
 *
 * The mark and one link. Nothing else in the middle — the name sits in the
 * utility line at the top beside the clock, at the same size, weight and
 * colour, so it reads as a masthead rather than as a headline. The restraint
 * plus the unexplained mark is the statement; a display-size wordmark was
 * competing with the only object on the page.
 *
 * Layered back to front: the background wash and dust, then approved company
 * logos drifting (empty until permissions land), then the mark and the type.
 */
export default function Landing() {
  return (
    <main
      data-scope="landing"
      className="relative grid min-h-dvh grid-rows-[auto_1fr_auto]"
    >
      <Atmosphere />
      <FloatingField />

      <header
        className="relative z-10 flex justify-center"
        style={{ padding: 'var(--pad)' }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <h1 className="t-micro" style={{ color: 'var(--muted)', margin: 0 }}>
            {SITE_NAME}
          </h1>
          <span
            className="t-micro"
            style={{ color: 'var(--muted)' }}
            aria-hidden="true"
          >
            ·
          </span>
          <Timestamp />
        </div>
      </header>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <SpinningMark />

        <nav className="t-small mt-12 flex gap-8">
          {LANDING_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <footer
        className="relative z-10 flex justify-start"
        style={{ padding: 'var(--pad)' }}
      >
        <p className="t-micro" style={{ color: 'var(--muted)', margin: 0 }}>
          {FOUNDED_LINE}
        </p>
      </footer>
    </main>
  )
}
