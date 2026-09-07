import Link from 'next/link'

import { ContactPopover } from '@/components/contact-popover'
import { YesLogo } from '@/components/yes-logo'
import { NAV } from '@/lib/site'

import styles from './site-footer.module.css'

export function SiteFooter() {
  return (
    <footer className={styles.footer} data-site-footer="">
      <div className={styles.bar}>
        <Link href="/" className={styles.identity} aria-label="YES home">
          <YesLogo className={styles.identityMark} />
          <span>Yale Entrepreneurial Society</span>
        </Link>

        {/*
          * Driven by NAV, not a second hand-written list. The hardcoded copy
          * had drifted: it still sent Press to /#press, an anchor into the
          * landing section that no longer exists, and still promoted People
          * after the header stopped doing so.
          */}
        <nav aria-label="Footer navigation">
          {NAV.filter((item) => !item.hidden).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.contact}>
          <ContactPopover />
        </div>
      </div>
    </footer>
  )
}
