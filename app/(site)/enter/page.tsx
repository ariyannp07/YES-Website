import type { Metadata } from 'next'

import { EnterForm } from '@/components/enter/enter-form'
import { alumniFeedConfigured } from '@/lib/alumni'

import styles from './enter.module.css'

export const metadata: Metadata = {
  title: 'Join YES',
  description: 'Join the Yale Entrepreneurial Society.',
}

export default function EnterPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Join YES.</h1>
        <p>Tell us what you’re building—or how you’d like to help.</p>
      </header>

      <section className={styles.formSection} aria-label="Join YES form">
        <EnterForm connected={alumniFeedConfigured()} />
      </section>
    </div>
  )
}
