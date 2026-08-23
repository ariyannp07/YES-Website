'use client'

import { useEffect, useRef, useState } from 'react'

import styles from './catalog.module.css'

interface SearchFieldProps {
  readonly initial?: string
  readonly variant?: 'hero' | 'top'
  readonly onSubmit: (query: string) => void
  readonly autoFocus?: boolean
  /** Fired on first focus — the caller uses it to warm the embedding model. */
  readonly onFirstFocus?: () => void
}

/**
 * One text field, submitted with Enter. No dropdowns, no filter chips, no
 * advanced panel — the semantic index handles "robotics in east africa" as
 * readily as a name, so a filter UI would only be a worse way to ask.
 */
export function SearchField({
  initial = '',
  variant = 'hero',
  onSubmit,
  autoFocus = false,
  onFirstFocus,
}: SearchFieldProps) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  const warmed = useRef(false)

  useEffect(() => {
    // preventScroll: focusing the field would otherwise scroll it into view,
    // dragging the site nav off the top of the screen on load.
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  return (
    <form
      className={`${styles.field} ${variant === 'top' ? styles.fieldTop : ''}`}
      onSubmit={(event) => {
        event.preventDefault()
        const query = value.trim()
        if (query) onSubmit(query)
      }}
      role="search"
    >
      <input
        ref={inputRef}
        className={styles.input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => {
          if (warmed.current) return
          warmed.current = true
          onFirstFocus?.()
        }}
        placeholder="What are you looking for?"
        aria-label="Search the catalog of Yale builders"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className={styles.submit}>
        Search
      </button>
    </form>
  )
}
