import type { Metadata } from 'next'
import Link from 'next/link'

import { DraftNotice } from '@/components/draft-notice'
import { PROOF, WORK_APPROVED, WORK_DRAFT_LABEL } from '@/content/work'

export const metadata: Metadata = {
  title: 'Work',
}

/**
 * The proof, and nothing else.
 *
 * The four initiatives were removed at owner direction, which leaves the page
 * as a plain column of numbers. No cards, no dividers beyond whitespace, no
 * animated counters. If a page feels empty, it's working.
 */
export default function WorkPage() {
  return (
    <div className="page-top" style={{ maxWidth: '52rem', marginInline: 'auto' }}>
      <DraftNotice approved={WORK_APPROVED} label={WORK_DRAFT_LABEL} />

      {PROOF.map((item) => (
        <div key={item.figure} style={{ marginBottom: 'clamp(3rem, 8vh, 4.5rem)' }}>
          <p className="t-display" style={{ margin: '0 0 0.6rem' }}>
            {item.figure}
          </p>
          <p className="t-small measure" style={{ margin: 0, lineHeight: 1.8 }}>
            {item.context}
          </p>
        </div>
      ))}

      <p className="t-small" style={{ margin: 'clamp(3rem, 10vh, 6rem) 0 0' }}>
        <Link href="/enter">Enter →</Link>
      </p>
    </div>
  )
}
