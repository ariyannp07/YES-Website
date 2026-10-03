import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Crawlers must reach /builders to see its noindex directive.
      disallow: ['/api/'],
    },
    sitemap: 'https://yesyale.org/sitemap.xml',
    host: 'https://yesyale.org',
  }
}
