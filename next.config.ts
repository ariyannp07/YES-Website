import type { NextConfig } from 'next'

/**
 * Static by default. Exactly one server route exists (`/api/enter`), which is
 * why this is a standard Vercel deployment rather than `output: 'export'` —
 * a static export has nowhere to hold the Airtable key server-side.
 *
 * `/builders` and `/alumni` are generated at BUILD time from their Airtable
 * views. There is deliberately no ISR and no cron: canon 05-human-ai-policy R1
 * requires that publishing the public catalog be a human-run deploy.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Portraits are processed to duotone at build time by scripts/build-portraits.mjs
  // and served as static files, so the runtime image optimizer is not needed.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
