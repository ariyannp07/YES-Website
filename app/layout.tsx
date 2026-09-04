import type { Metadata } from 'next'
import { Archivo, Bodoni_Moda } from 'next/font/google'

import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'

import './globals.css'

const SITE_URL = 'https://yesyale.org'
const SITE_NAME = 'Yale Entrepreneurial Society'
const SITE_DESCRIPTION =
  'Yale Entrepreneurial Society. The next Yale company is a conversation that hasn’t happened yet. Explore The YES Thesis, People, and Press.'

const SEARCH_IDENTITY = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: 'YES',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.png`,
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: 'YES',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

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
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE_NAME,
    title: 'YES',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: 'YES',
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SEARCH_IDENTITY) }}
        />
      </head>
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
