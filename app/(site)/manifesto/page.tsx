import type { Metadata } from 'next'

import { DraftNotice } from '@/components/draft-notice'
import { MANIFESTO } from '@/content/manifesto'

export const metadata: Metadata = {
  title: 'Manifesto',
}

/**
 * The essay (build spec §3). Single column, generous line height, no images.
 * Opinion before information.
 *
 * Three lines stand alone in display type — the pivot, the question, and the
 * instruction. The owners' text is built around those beats, so the typography
 * follows the writing rather than imposing a rhythm on it. There is no trailing
 * signature: the piece opens by naming both co-presidents.
 */
export default function ManifestoPage() {
  return (
    <article className="measure page-top" style={{ marginInline: 'auto' }}>
      <DraftNotice approved={MANIFESTO.approved} label={MANIFESTO.draftLabel} />

      <div className="prose t-small">
        {MANIFESTO.blocks.map((block, index) => {
          if (block.kind === 'turn') {
            return (
              <p
                key={index}
                className="t-display"
                style={{ margin: '2.75rem 0 2.75rem' }}
              >
                {block.text}
              </p>
            )
          }

          if (block.kind === 'stack') {
            return (
              <div
                key={index}
                className="standard"
                style={{ margin: '0 0 1.55em' }}
              >
                {block.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )
          }

          return <p key={index}>{block.text}</p>
        })}
      </div>
    </article>
  )
}
