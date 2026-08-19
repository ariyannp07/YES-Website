'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { PALETTES, PALETTE_LABELS, type Palette } from '@/lib/palette'

const STORAGE_KEY = 'yes.palette'

/** Routes that paint their own background and ignore the palette tokens. */
const ART_DIRECTED = ['/', '/spectre', '/concepts'] as const

/**
 * PREVIEW-ONLY. Build spec §8.3 asks the owners to choose the palette from
 * rendered screens, so both directions need to be reachable on one deployment.
 * Gated behind NEXT_PUBLIC_SHOW_PALETTE_TOGGLE; production ships without it and
 * this file contributes nothing to the bundle.
 *
 * Deliberately drawn in the site's own grammar — micro type, plain text links,
 * no chrome — so it does not misrepresent how the page actually looks.
 */
export function PaletteToggle({ initial }: { readonly initial: Palette }) {
  const [palette, setPalette] = useState<Palette>(initial)
  const pathname = usePathname()

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && (PALETTES as readonly string[]).includes(stored)) {
        setPalette(stored as Palette)
      }
    } catch {
      // Private browsing or blocked storage. The default palette is correct.
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.palette = palette
    try {
      window.localStorage.setItem(STORAGE_KEY, palette)
    } catch {
      // Non-fatal: the palette still applies for this page view.
    }
  }, [palette])

  // Art-directed pages set their own colours, so the switcher does nothing on
  // them except sit there — and in Paper it drops to ~1:1 against their own
  // near-black backgrounds. The prototypes moved to `/` and `/spectre`, so this
  // list has to follow them.
  if (ART_DIRECTED.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null
  }

  return (
    <div
      className="t-micro fixed bottom-3 right-3 z-50 flex gap-3 opacity-45 transition-opacity hover:opacity-100"
      style={{ color: 'var(--muted)' }}
    >
      {PALETTES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setPalette(option)}
          className="cursor-pointer bg-transparent p-0 uppercase tracking-[0.06em]"
          style={{
            color: option === palette ? 'var(--fg)' : 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'inherit',
            textDecoration: option === palette ? 'underline' : 'none',
            textUnderlineOffset: '0.25em',
          }}
          aria-pressed={option === palette}
        >
          {PALETTE_LABELS[option]}
        </button>
      ))}
    </div>
  )
}
