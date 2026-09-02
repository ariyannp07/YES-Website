import type { Metadata } from 'next'

import { EnterForm } from '@/components/enter/enter-form'
import { alumniFeedConfigured } from '@/lib/alumni'

import styles from './enter.module.css'

export const metadata: Metadata = {
  title: 'Join YES',
  description: 'Tell the Yale Entrepreneurial Society what you are building.',
}

export default function EnterPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Join YES</p>
          <h1>Bring the question you cannot leave alone.</h1>
        </div>
        <p>
          Tell us what you have built—or what you are ready to begin. You choose
          whether your profile may appear in the public directory.
        </p>
      </header>

      <section className={styles.formSection}>
        <aside>
          <h2>One form. Three ways to contribute.</h2>
          <dl>
            <div>
              <dt>Builder</dt>
              <dd>You are making something or preparing to start.</dd>
            </div>
            <div>
              <dt>Backer</dt>
              <dd>You can offer capital, introductions, or institutional support.</dd>
            </div>
            <div>
              <dt>Helper</dt>
              <dd>You can offer time, knowledge, or a specific skill.</dd>
            </div>
          </dl>
        </aside>
        <EnterForm connected={alumniFeedConfigured()} />
      </section>
    </div>
  )
}
