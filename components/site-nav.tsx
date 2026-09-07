'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { YesLogo } from '@/components/yes-logo'
import { NAV } from '@/lib/site'

import styles from './site-nav.module.css'

export function SiteNav() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const update = () => setHasScrolled(window.scrollY > 32)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [pathname])

  /**
   * The nav is always reachable, including at the top of the landing.
   *
   * It used to stay hidden on home until the first scroll, which worked while
   * the landing was six scrolling sections deep. The landing is now a single
   * screen — a statement, the firms, one clipping — and everything else on the
   * site is reachable ONLY through this header. Gating it behind a scroll that
   * a tall display never produces made Common Room, Hacker House, People, Press
   * and Thesis unreachable from the front door.
   */
  const isVisible = true

  const isCurrent = (href: string) =>
    !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`))

  return (
    <header
      className={`${styles.header} ${isHome ? styles.homeHeader : ''} ${
        isVisible ? '' : styles.hidden
      }`}
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="YES home">
          <YesLogo className={styles.brandMark} />
          <span
            className={`${styles.name} ${isHome ? styles.homeName : ''} ${
              isHome && hasScrolled ? styles.condensedName : ''
            }`}
            aria-label="Yale Entrepreneurial Society"
          >
            <span className={styles.word} aria-hidden="true">
              <span className={styles.initial}>Y</span>
              <span className={styles.remainder}>ale</span>
            </span>
            <span className={styles.word} aria-hidden="true">
              <span className={styles.initial}>E</span>
              <span className={styles.remainder}>ntrepreneurial</span>
            </span>
            <span className={styles.word} aria-hidden="true">
              <span className={styles.initial}>S</span>
              <span className={styles.remainder}>ociety</span>
            </span>
          </span>
          <span className={`${styles.shortName} ${isHome ? styles.homeShortName : ''}`}>
            YES
          </span>
        </Link>

        <nav
          className={styles.nav}
          aria-label="Primary navigation"
          aria-hidden={isVisible ? undefined : true}
        >
          {NAV.filter((item) => !item.hidden).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={isVisible ? undefined : -1}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/enter"
          className={styles.join}
          tabIndex={isVisible ? undefined : -1}
          aria-hidden={isVisible ? undefined : true}
        >
          Join YES
        </Link>
      </div>
    </header>
  )
}
