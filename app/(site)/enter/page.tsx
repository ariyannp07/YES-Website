import type { Metadata } from 'next'

import { EnterForm } from '@/components/enter/enter-form'
import { alumniFeedConfigured } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Enter',
}

/**
 * One form (build spec §3). No page header beyond the nav, no explanation of
 * what happens next, no "we'll get back to you in 3–5 business days".
 */
export default function EnterPage() {
  return (
    <div className="page-top" style={{ marginInline: 'auto', maxWidth: 'var(--measure)' }}>
      <EnterForm connected={alumniFeedConfigured()} />
    </div>
  )
}
