import type { Metadata } from 'next'

import { CONTACT } from '@/lib/site'

import styles from './enter.module.css'

export const metadata: Metadata = {
  title: 'Join YES',
  description: 'Apply to join YES or connect with Yale builders.',
}

export default function EnterPage() {
  return (
    <div className={styles.page}>
      <section className={styles.studentSection} aria-label="Yale student application">
        <div className={styles.studentLinks}>
          <h1>
            <a
              className={styles.applicationLink}
              href="https://docs.google.com/forms/d/e/1FAIpQLSeJUO4ldpVeB8v7OkAg30WBdqh-QwHGC9q2RpCbZ2BUDxteuQ/viewform?usp=publish-editor"
              target="_blank"
              rel="noreferrer"
              aria-label="Apply to YES as a Yale student, rolling applications (opens in a new tab)"
            >
              Application Link (Rolling)
            </a>
          </h1>
          <a
            className={styles.mailingLink}
            href="https://forms.gle/ADc3ab1RC14PPgZD9"
            target="_blank"
            rel="noreferrer"
            aria-label="Join the YES mailing list (opens in a new tab)"
          >
            Mailing List
          </a>
        </div>
      </section>

      <section className={styles.contactSection} aria-label="Contact YES">
        <address className={styles.contacts}>
          <div>
            <h2>Ariyan Patel</h2>
            <a href={`mailto:${CONTACT.ariyan}`}>{CONTACT.ariyan}</a>
          </div>
          <div>
            <h2>Sofia Teifeld</h2>
            <a href={`mailto:${CONTACT.sofia}`}>{CONTACT.sofia}</a>
          </div>
        </address>
      </section>
    </div>
  )
}
