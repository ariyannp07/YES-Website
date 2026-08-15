'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import styles from './dossier-modal.module.css'

/**
 * Dossier expansion pattern A — in place, over the wall.
 *
 * Build spec §3 asks for both expansion patterns to be prototyped. Both exist
 * here from one implementation, because every tile is a real link:
 *   · Clicking a face from the mosaic intercepts the route and expands the
 *     dossier over the wall (this component).
 *   · Opening /alumni/<slug> cold — a shared link, a press email, the Bazaar
 *     QR — renders the same dossier as a full-page takeover, server-rendered.
 * The "Open as page" link below switches between them so the owners can compare
 * the two on the same content.
 *
 * Esc closes. Focus moves into the panel on open and the backdrop traps
 * scrolling, so the wall does not move underneath.
 */
export function DossierModal({
  slug,
  children,
}: {
  readonly slug: string
  readonly children: React.ReactNode
}) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.back()
    }

    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [router])

  return (
    <div className={styles.backdrop}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Dossier"
        tabIndex={-1}
      >
        <div className={`${styles.controls} t-micro`}>
          <button type="button" className={styles.close} onClick={() => router.back()}>
            Close (esc)
          </button>

          <Link href={`/alumni/${slug}`} scroll={false} prefetch={false}>
            Open as page →
          </Link>
        </div>

        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  )
}
