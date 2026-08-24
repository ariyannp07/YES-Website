'use client'

import { useEffect, useState } from 'react'

interface TypedLineProps {
  readonly text: string
  /** Seconds from first paint when typing begins. */
  readonly at: number
  /** Characters per second. */
  readonly cps: number
  readonly className?: string
  /** Renders complete immediately — reduced motion, or no JS. */
  readonly instant?: boolean
}

/**
 * Types a line out, character by character.
 *
 * The full string is always in the DOM inside a visually-hidden span, and the
 * animated copy is aria-hidden. Otherwise a screen reader announces the line
 * again on every character — and the accessible name of the page would churn
 * for eight seconds before settling.
 *
 * Width is reserved by the hidden copy, so nothing reflows as characters land.
 */
export function TypedLine({ text, at, cps, className, instant = false }: TypedLineProps) {
  const [shown, setShown] = useState(instant ? text.length : 0)

  useEffect(() => {
    // Typing is motion: characters appearing one by one is exactly the kind of
    // animated text reduced-motion asks us to skip. The line still arrives — it
    // just arrives whole.
    const reduce =
      instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setShown(text.length)
      return
    }

    let raf = 0
    const start = performance.now() + at * 1000
    const perChar = 1000 / cps

    const tick = () => {
      const elapsed = performance.now() - start
      const next = Math.max(0, Math.min(text.length, Math.floor(elapsed / perChar)))
      setShown(next)
      if (next < text.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, at, cps, instant])

  const done = shown >= text.length

  return (
    <span className={className} data-typed={done ? 'done' : 'typing'}>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {!done ? <i data-caret="" /> : null}
      </span>
      {/* The stable, complete line: reserves the layout and is what is read. */}
      <span data-ghost="">{text}</span>
    </span>
  )
}
