import type { Metadata } from 'next'

import { SpectreForm } from '@/components/spectre/spectre-form'
import { alumniFeedConfigured } from '@/lib/alumni'

export const metadata: Metadata = {
  title: 'Spectre',
  robots: { index: false, follow: false },
}

/**
 * The way into Spectre. Three questions, then one line back.
 */
export default function SpectreApplyPage() {
  return <SpectreForm connected={alumniFeedConfigured()} />
}
