import type { Metadata } from 'next'

import { EnterForm } from '@/components/enter/enter-form'
import { alumniFeedConfigured } from '@/lib/alumni'

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
              href="https://forms.gle/BDVJeKqJbmvhdCCV6"
              target="_blank"
              rel="noreferrer"
              aria-label="Apply to YES as a Yale student (opens in a new tab)"
            >
              Application Link.
            </a>
          </h1>
          <a
            className={styles.mailingLink}
            href="https://forms.gle/ADc3ab1RC14PPgZD9"
            target="_blank"
            rel="noreferrer"
            aria-label="Join the YES mailing list (opens in a new tab)"
          >
            Mailing List.
          </a>
        </div>
      </section>

      <section className={styles.associateSection} aria-labelledby="associate-heading">
        <div className={styles.associateInner}>
          <div className={styles.associateCopy}>
            <h2 id="associate-heading">Get associated with YES.</h2>
            <p>
              YES works with alumni, founders, investors, and operators who can support
              Yale builders. If you can offer capital, introductions, expertise, or time,
              tell us how you’d like to contribute.
            </p>
          </div>
          <EnterForm connected={alumniFeedConfigured()} />
        </div>
      </section>
    </div>
  )
}
