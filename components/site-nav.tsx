'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { NAV } from '@/lib/site'
import { SIGMA_PATH } from '@/lib/yes-geometry'

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

  const isVisible = !isHome || hasScrolled

  const isCurrent = (href: string) =>
    !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`))

  return (
    <header
      className={`${styles.header} ${isHome ? styles.homeHeader : ''} ${
        isVisible ? styles.visible : styles.hidden
      }`}
      aria-hidden={isVisible ? undefined : true}
    >
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="YES home">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d={SIGMA_PATH} fill="currentColor" />
          </svg>
          <span
            className={`${styles.name} ${
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
          <span className={styles.shortName}>YES</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary navigation">
          {NAV.filter((item) => !item.hidden).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/enter" className={styles.join}>
          Join YES
        </Link>
      </div>
    </header>
  )
}
