import type { Metadata } from 'next'

import { AudereForm } from '@/components/audere/audere-form'
import { alumniFeedConfigured } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Audere',
  robots: { index: false, follow: false },
}

/**
 * The way into Audere. Three questions, then one line back.
 */
export default function AudereApplyPage() {
  return <AudereForm connected={alumniFeedConfigured()} />
}
