import Image from 'next/image'
import Link from 'next/link'

import { ContactPopover } from '@/components/contact-popover'

import styles from './site-footer.module.css'

export function SiteFooter() {
  return (
    <footer className={styles.footer} data-site-footer="">
      <div className={styles.cta}>
        <p>What will you build?</p>
        <Link href="/enter">Join YES</Link>
      </div>

      <div className={styles.bar}>
        <Link href="/" className={styles.identity} aria-label="YES home">
          <Image
            className={styles.identityMark}
            src="/brand/yes-logo.png"
            alt=""
            width={320}
            height={410}
            unoptimized
          />
          <span>Yale Entrepreneurial Society</span>
        </Link>

        <nav aria-label="Footer navigation">
          <Link href="/thesis">Thesis</Link>
          <Link href="/catalog">People</Link>
          <Link href="/common-room">Common Room</Link>
          <Link href="/#press">Press</Link>
        </nav>

        <div className={styles.contact}>
          <ContactPopover />
        </div>
      </div>
    </footer>
  )
}
