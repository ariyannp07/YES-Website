import type { Metadata } from 'next'

import { AudeForm } from '@/components/aude/aude-form'
import { alumniFeedConfigured } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Aude',
  robots: { index: false, follow: false },
}

/**
 * The way into Aude. Three questions, then one line back.
 */
export default function AudeApplyPage() {
  return <AudeForm connected={alumniFeedConfigured()} />
}
