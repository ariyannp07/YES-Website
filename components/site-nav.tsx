'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Timestamp } from '@/components/timestamp'
import { NAV } from '@/lib/site'

/**
 * The interior nav (build spec §4): one minimal top line in small utility type.
 * Plain text, no background bar, no dropdowns. Mobile gets the same links,
 * wrapped — no animated hamburger.
 *
 * The current page renders as plain foreground text rather than a link. That is
 * not a second link style; it is the absence of a link, because there is
 * nowhere for it to go.
 */
export function SiteNav() {
  const pathname = usePathname()

  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header style={{ padding: 'var(--pad)' }}>
      <nav className="t-micro flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/">YES</Link>

        {NAV.filter((item) => !item.hidden).map((item) =>
          isCurrent(item.href) ? (
            <span key={item.href} aria-current="page" style={{ color: 'var(--fg)' }}>
              {item.label}
            </span>
          ) : (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ),
        )}

        <Timestamp className="ml-auto" />
      </nav>
    </header>
  )
}
