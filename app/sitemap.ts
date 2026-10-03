import type { MetadataRoute } from 'next'

import { profileAlumni } from '@/lib/alumni'
import { allEntries } from '@/lib/reservoir'
import { SITE_URL } from '@/lib/seo'
import { NAV } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const people = await profileAlumni()
  const paths = new Set([
    '/',
    ...NAV.filter((item) => !item.hidden).map((item) => item.href),
    '/catalog',
    '/enter',
  ])

  return [
    ...Array.from(paths, (path) => ({ url: new URL(path, SITE_URL).href })),
    ...people
      .filter((person) => !person.placeholder)
      .map((person) => ({ url: `${SITE_URL}/catalog/${person.slug}` })),
    ...allEntries()
      .filter((entry) => entry.approved && !entry.url)
      .map((entry) => ({ url: `${SITE_URL}/reservoir/${entry.slug}` })),
  ]
}
