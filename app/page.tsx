import Link from 'next/link'

import { FloatingField } from '@/components/field/floating-field'
import { SpinningMark } from '@/components/field/spinning-mark'
import { Timestamp } from '@/components/timestamp'
import { FOUNDED_LINE, LANDING_LINKS, SITE_NAME } from '@/lib/site'

/**
 * The front door (build spec §3).
 *
 * The floating field, the live clock, the name, and one plain text link. No
 * hero video, no carousel, no "Join us!" button, no nav bar, no scroll — the
 * page is the viewport. The restraint plus the unexplained proof is the
 * statement.
 */
export default function Landing() {
  return (
    <main
      data-scope="landing"
      className="relative grid min-h-dvh grid-rows-[auto_1fr_auto]"
    >
      <FloatingField limit={11} />

      <header
        className="relative z-10 flex justify-start"
        style={{ padding: 'var(--pad)' }}
      >
        <Timestamp />
      </header>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <SpinningMark />

        <h1 className="t-display" style={{ margin: '2.25rem 0 0' }}>
          {SITE_NAME}
        </h1>

        <nav className="t-small mt-8 flex gap-8">
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
