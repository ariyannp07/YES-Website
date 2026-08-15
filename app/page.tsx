import Link from 'next/link'

import { Atmosphere } from '@/components/field/atmosphere'
import { FloatingField } from '@/components/field/floating-field'
import { SpinningMark } from '@/components/field/spinning-mark'
import { Timestamp } from '@/components/timestamp'
import {
  FOUNDED_LINE,
  LANDING_LINE,
  LANDING_LINKS,
  SITE_NAME,
} from '@/lib/site'

/**
 * The front door (build spec §3).
 *
 * The mark, the live clock, the name, one line, one link. No hero video, no
 * carousel, no "Join us!" button, no nav bar, no scroll — the page is the
 * viewport. The restraint plus the unexplained proof is the statement.
 *
 * Layered back to front: atmosphere, then approved company logos drifting
 * (empty until permissions land), then the mark and the type.
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
        className="relative z-10 flex justify-start"
        style={{ padding: 'var(--pad)' }}
      >
        <Timestamp />
      </header>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <SpinningMark />

        <h1 className="t-display" style={{ margin: '2.5rem 0 0' }}>
          {SITE_NAME}
        </h1>

        <p
          className="t-small"
          style={{
            margin: '1.5rem auto 0',
            maxWidth: '31rem',
            color: 'var(--muted)',
            lineHeight: 1.75,
            textWrap: 'balance',
          }}
        >
          {LANDING_LINE}
        </p>

        <nav className="t-small mt-10 flex gap-8">
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
