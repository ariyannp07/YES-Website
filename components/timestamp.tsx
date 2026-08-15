'use client'

import { useEffect, useState } from 'react'

/**
 * The live date and clock — the quiet site-wide signature (build spec §1).
 *
 * `aria-hidden` per build spec §6: a screen reader must not be made to listen to
 * a ticking clock. Before hydration it renders a fixed-width static fallback, so
 * there is no layout shift and no server/client time mismatch.
 */

const PLACEHOLDER = '——— —— ——— ———— · ——:——:——'

const format = (date: Date): string => {
  const weekday = date
    .toLocaleDateString('en-US', { weekday: 'short' })
    .toUpperCase()
  const day = String(date.getDate()).padStart(2, '0')
  const month = date
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase()
  const time = date.toLocaleTimeString('en-GB', { hour12: false })

  return `${weekday} ${day} ${month} ${date.getFullYear()} · ${time}`
}

export function Timestamp({ className = '' }: { readonly className?: string }) {
  const [now, setNow] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setNow(format(new Date()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span
      aria-hidden="true"
      className={`t-micro ${className}`}
      style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}
    >
      {now ?? PLACEHOLDER}
    </span>
  )
}
