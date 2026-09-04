import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/builders'],
    },
    sitemap: 'https://yesyale.org/sitemap.xml',
    host: 'https://yesyale.org',
  }
}
