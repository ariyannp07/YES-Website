'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CONFIRMATION, SpectreApplication } from '@/lib/spectre-schema'

import styles from './spectre-form.module.css'

/**
 * SPECTRE — the application.
 *
 * Three questions. No programme description, no deadline, no reassurance about
 * what happens next: the page assumes you already know why you are here, which
 * is the point of a tap-only cohort.
 */

type Status = 'idle' | 'submitting' | 'done' | 'error'
type FieldErrors = Partial<Record<string, readonly string[]>>

const EMPTY = { name: '', email: '', why: '', company: '' }

export function SpectreForm({ connected }: { readonly connected: boolean }) {
  const [values, setValues] = useState(EMPTY)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Immutable updates only — every change produces a new state object.
  const update = <K extends keyof typeof EMPTY>(key: K, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('submitting')
    setFieldErrors({})
    setMessage('')

    const parsed = SpectreApplication.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      setStatus('error')
      return
    }

    try {
      const response = await fetch('/api/spectre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        fields?: FieldErrors
      }

      if (!response.ok || !body.ok) {
        setFieldErrors(body.fields ?? {})
        setMessage(body.message ?? 'That did not save. Try again.')
        setStatus('error')
        return
      }

      setStatus('done')
    } catch {
      setMessage('That did not save. Check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className={styles.root}>
        <div className={styles.inner}>
          <p className={styles.done}>{CONFIRMATION}</p>
        </div>
      </div>
    )
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0]

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <p className={`${styles.eyebrow} t-micro`}>Spectre</p>

        <form onSubmit={onSubmit} noValidate className="t-small">
          {connected ? null : (
            <p className={`${styles.notice} t-micro`}>
              [ Not connected — applications open when the Airtable key is set. ]
            </p>
          )}

          <label className={styles.field}>
            <span className={`${styles.label} t-micro`}>Name</span>
            <input
              className={styles.input}
              type="text"
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={Boolean(errorFor('name'))}
            />
            {errorFor('name') ? (
              <span className={`${styles.error} t-micro`}>{errorFor('name')}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={`${styles.label} t-micro`}>Email</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
              aria-invalid={Boolean(errorFor('email'))}
            />
            {errorFor('email') ? (
              <span className={`${styles.error} t-micro`}>{errorFor('email')}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={`${styles.label} t-micro`}>Why you</span>
            <textarea
              className={styles.textarea}
              name="why"
              rows={4}
              value={values.why}
              onChange={(e) => update('why', e.target.value)}
              aria-invalid={Boolean(errorFor('why'))}
            />
            {errorFor('why') ? (
              <span className={`${styles.error} t-micro`}>{errorFor('why')}</span>
            ) : null}
          </label>

          {/* Honeypot. Never shown, never announced, never filled by a person. */}
          <div className={styles.honeypot} aria-hidden="true">
            <label>
              Company
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={values.company}
                onChange={(e) => update('company', e.target.value)}
              />
            </label>
          </div>

          {message ? (
            <p className={`${styles.error} t-micro`} role="alert" style={{ marginBottom: '1.5rem' }}>
              {message}
            </p>
          ) : null}

          <button
            className={`${styles.submit} t-micro`}
            type="submit"
            disabled={status === 'submitting' || !connected}
          >
            {status === 'submitting' ? 'Sending…' : 'Enter'}
          </button>
        </form>

        <p className={`${styles.back} t-micro`}>
          <Link href="/spectre">← Back</Link>
        </p>
      </div>
    </div>
  )
}
