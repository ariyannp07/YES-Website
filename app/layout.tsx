import type { Metadata } from 'next'

import { PaletteToggle } from '@/components/palette-toggle'
import { paletteToggleEnabled, resolvePalette } from '@/lib/palette'

import './globals.css'

/*
 * No webfonts.
 *
 * Every type token now resolves to Times New Roman, which is installed rather
 * than downloaded — so Playfair Display, Inter and JetBrains Mono are gone
 * along with their requests. Leaving next/font in place would have shipped
 * three families that nothing references.
 */

/**
 * Build spec §3: the page title is `YES`. Not
 * "Yale Entrepreneurial Society (YES) | Student Entrepreneurship Hub" —
 * the SEO-stuffed title is part of the old genre.
 */
export const metadata: Metadata = {
  title: { default: 'YES', template: '%s · YES' },
  description: 'Yale Entrepreneurial Society.',
  metadataBase: new URL('https://yesyale.org'),
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const palette = resolvePalette(process.env.NEXT_PUBLIC_PALETTE)

  return (
    <html lang="en" data-palette={palette}>
      <body>
        {children}
        {paletteToggleEnabled() ? <PaletteToggle initial={palette} /> : null}
      </body>
    </html>
  )
}
