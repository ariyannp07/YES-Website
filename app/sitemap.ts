import type { MetadataRoute } from 'next'

const SITE_URL = 'https://yesyale.org'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/thesis`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${SITE_URL}/catalog`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/common-room`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/enter`, changeFrequency: 'yearly', priority: 0.6 },
  ]
}
