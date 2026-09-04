'use client'

import { useRef } from 'react'

import styles from './catalog.module.css'

interface SearchFieldProps {
  readonly value: string
  readonly searching: boolean
  readonly onChange: (value: string) => void
  readonly onSubmit: (query: string) => void
  readonly onClear: () => void
  readonly onFirstFocus?: () => void
}

export function SearchField({
  value,
  searching,
  onChange,
  onSubmit,
  onClear,
  onFirstFocus,
}: SearchFieldProps) {
  const warmed = useRef(false)

  return (
    <form
      className={styles.field}
      onSubmit={(event) => {
        event.preventDefault()
        const query = value.trim()
        if (query) onSubmit(query)
      }}
      role="search"
    >
      <label htmlFor="builder-search" className={styles.visuallyHidden}>
        Search people
      </label>
      <div className={styles.fieldRow} data-searching={searching ? 'true' : 'false'}>
        <input
          id="builder-search"
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (warmed.current) return
            warmed.current = true
            onFirstFocus?.()
          }}
          placeholder="Search people"
          autoComplete="off"
          spellCheck={false}
        />
        {value ? (
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear
          </button>
        ) : null}
        <span className={styles.searchTrace} aria-hidden="true" />
      </div>
    </form>
  )
}
