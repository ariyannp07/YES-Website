import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google'

import { PaletteToggle } from '@/components/palette-toggle'
import { paletteToggleEnabled, resolvePalette } from '@/lib/palette'

import './globals.css'

const display = Playfair_Display({
  subsets: ['latin'],
  // Variable font — the whole 400–900 range is available to the display token.
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair-display',
  display: 'swap',
})

const body = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

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
    <html
      lang="en"
      data-palette={palette}
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        {children}
        {paletteToggleEnabled() ? <PaletteToggle initial={palette} /> : null}
      </body>
    </html>
  )
}
