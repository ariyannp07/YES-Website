import type { Metadata } from 'next'

import { SITE_NAME } from './site'

export const SITE_URL = 'https://yesyale.org'
export const SITE_DESCRIPTION =
  'Yale Entrepreneurial Society (YES), a community of Yale founders and builders. Explore YES Membership, Common Room, the Yale Hacker House, and our thesis.'

/** Each indexable page identifies itself, rather than inheriting the homepage URL. */
export function pageMetadata(
  path: string,
  { title, description = SITE_DESCRIPTION, robots }: {
    title: string
    description?: string
    robots?: Metadata['robots']
  },
): Metadata {
  const url = new URL(path, SITE_URL).href
  const displayTitle = path === '/' ? `${SITE_NAME} (YES)` : `${title} · YES`

  return {
    title: { absolute: displayTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url,
      siteName: SITE_NAME,
      title: displayTitle,
      description,
    },
    twitter: { card: 'summary', title: displayTitle, description },
    ...(robots ? { robots } : {}),
  }
}
