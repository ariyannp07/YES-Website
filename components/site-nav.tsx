'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

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

  const isVisible = !isHome || hasScrolled

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
          <Image
            className={styles.brandMark}
            src="/brand/yes-logo.png"
            alt=""
            width={391}
            height={511}
          />
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
