import type { Metadata } from 'next'
import Link from 'next/link'

import { DraftNotice } from '@/components/draft-notice'
import {
  INITIATIVES,
  PROOF,
  PROOF_CLOSE,
  WORK_APPROVED,
  WORK_DRAFT_LABEL,
} from '@/content/work'

export const metadata: Metadata = {
  title: 'Work',
}

/**
 * The four initiatives as a plain numbered index, then proof (build spec §3).
 * No cards, no dividers beyond whitespace, no animated counters.
 */
export default function WorkPage() {
  return (
    <div className="page-top" style={{ maxWidth: '52rem', marginInline: 'auto' }}>
      <DraftNotice approved={WORK_APPROVED} label={WORK_DRAFT_LABEL} />

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {INITIATIVES.map((initiative) => (
          <li key={initiative.index} style={{ marginBottom: 'clamp(3.5rem, 9vh, 6rem)' }}>
            <p className="t-micro" style={{ color: 'var(--muted)', margin: '0 0 0.75rem' }}>
              {initiative.index}
            </p>

            <h2 className="t-display" style={{ margin: '0 0 1.25rem' }}>
              {initiative.name}
            </h2>

            <p className="t-small measure" style={{ margin: 0, lineHeight: 1.8 }}>
              {initiative.body}
            </p>
          </li>
        ))}
      </ol>

      <section style={{ marginTop: 'clamp(4rem, 14vh, 9rem)' }}>
        <p className="t-micro" style={{ color: 'var(--muted)', margin: '0 0 2.5rem' }}>
          Proof
        </p>

        {PROOF.map((item) => (
          <div key={item.figure} style={{ marginBottom: 'clamp(2.5rem, 7vh, 4rem)' }}>
            <p className="t-display" style={{ margin: '0 0 0.5rem' }}>
              {item.figure}
            </p>
            <p className="t-small measure" style={{ margin: 0, lineHeight: 1.8 }}>
              {item.context}
            </p>
          </div>
        ))}

        <p
          className="t-small measure"
          style={{ margin: 'clamp(2rem, 6vh, 3.5rem) 0 0', lineHeight: 1.8 }}
        >
          {PROOF_CLOSE}
        </p>
      </section>

      <p className="t-small" style={{ margin: 'clamp(4rem, 12vh, 7rem) 0 0' }}>
        <Link href="/enter">Enter →</Link>
      </p>
    </div>
  )
}
