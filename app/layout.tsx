import type { Metadata } from 'next'
import { Archivo, Bodoni_Moda } from 'next/font/google'

import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/seo'
import { SITE_NAME } from '@/lib/site'

import './globals.css'

const SEARCH_IDENTITY = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: 'YES',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      email: 'yes@yale.edu',
      foundingDate: '1999',
      sameAs: ['https://ventures.yale.edu/node/2215'],
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
  title: { default: `${SITE_NAME} (YES)`, template: '%s · YES' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title: `${SITE_NAME} (YES)`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} (YES)`,
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
