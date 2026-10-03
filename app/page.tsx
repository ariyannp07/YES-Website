import { HomePage } from '@/components/landing/home-page'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('/', { title: 'Yale Entrepreneurial Society' })

export default function Landing() {
  return <HomePage />
}
