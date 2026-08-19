'use client'

import dynamic from 'next/dynamic'

/**
 * Client boundary for the WebGL scene.
 *
 * `ssr: false` keeps Three.js out of the server bundle and out of the initial
 * HTML; the chunk is fetched after first paint. The static mark underneath is
 * what the page renders until then, so the byte cost never sits on LCP.
 */
const MarkCanvas = dynamic(() => import('./mark-canvas'), {
  ssr: false,
  loading: () => null,
})

export function MarkMount() {
  return <MarkCanvas />
}
