import type { Metadata } from 'next'
import Link from 'next/link'

import { DraftNotice } from '@/components/draft-notice'
import { MANIFESTO } from '@/content/manifesto'

export const metadata: Metadata = {
  title: 'Manifesto',
}

/**
 * The essay (build spec §3). Single column, generous line height, no images.
 * Opinion before information.
 */
export default function ManifestoPage() {
  return (
    <article className="measure page-top" style={{ marginInline: 'auto' }}>
      <DraftNotice
        approved={MANIFESTO.approved}
        label={MANIFESTO.draftLabel}
      />

      <div className="prose t-small">
        {MANIFESTO.blocks.map((block, index) => {
          if (block.kind === 'turn') {
            return (
              <p
                key={index}
                className="t-display"
                style={{ margin: '2.5rem 0 2.75rem' }}
              >
                {block.text}
              </p>
            )
          }

          if (block.kind === 'standard') {
            return (
              <div key={index} className="standard" style={{ margin: '0 0 1.55em' }}>
                {block.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )
          }

          return <p key={index}>{block.text}</p>
        })}
      </div>

      <p
        className="t-micro"
        style={{ color: 'var(--muted)', margin: '3.5rem 0 0' }}
      >
        {MANIFESTO.signature.map((line) => (
          <span key={line} style={{ display: 'block' }}>
            {line}
          </span>
        ))}
      </p>

      <p className="t-small" style={{ margin: '4.5rem 0 0' }}>
        <Link href="/work">See the work →</Link>
      </p>
    </article>
  )
}
