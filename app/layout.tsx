import type { Metadata } from 'next'
import { Archivo, Bodoni_Moda } from 'next/font/google'

import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'

import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-wsj',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'YES', template: '%s · YES' },
  description:
    'Yale Entrepreneurial Society — a home for people at Yale who choose to build.',
  metadataBase: new URL('https://yesyale.org'),
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bodoniModa.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <div className="site-shell">
          <SiteNav />
          <main className="site-main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
