'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CONFIRMATION, AudeApplication } from '@/lib/aude-schema'

import styles from './aude-form.module.css'

/**
 * AUDE — the application.
 *
 * Three questions. No programme description, no deadline, no reassurance about
 * what happens next: the page assumes you already know why you are here, which
 * is the point of a tap-only cohort.
 */

type Status = 'idle' | 'submitting' | 'done' | 'error'
type FieldErrors = Partial<Record<string, readonly string[]>>

const EMPTY = { name: '', email: '', why: '', confirmRef: '' }

/**
 * The error message sits OUTSIDE the `<label>`. Inside, it is concatenated into
 * the input's accessible name — the field announces itself as "Name Required."
 * and voice control can no longer address it by name.
 */
function Field({
  id,
  label,
  error,
  children,
}: {
  readonly id: string
  readonly label: string
  readonly error?: string
  readonly children: React.ReactNode
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        <span className={`${styles.label} t-micro`}>{label}</span>
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className={`${styles.error} t-micro`}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function AudeForm({ connected }: { readonly connected: boolean }) {
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

    const parsed = AudeApplication.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      // Without this the only role="alert" never renders, and a screen-reader
      // user gets no feedback at all when Enter fails validation.
      setMessage('Something did not go through. Check the fields below.')
      setStatus('error')
      return
    }

    try {
      const response = await fetch('/api/aude', {
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
  const describedBy = (field: string) =>
    errorFor(field) ? `${field}-error` : undefined

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <p className={`${styles.eyebrow} t-micro`}>Aude</p>

        {/* method="post" matters even though onSubmit handles the happy path:
            without it a no-JS submit defaults to GET and puts the applicant's
            name, email and essay into the URL, history and server logs. */}
        <form method="post" onSubmit={onSubmit} noValidate className="t-small">
          {connected ? null : (
            <p className={`${styles.notice} t-micro`}>
              [ Not connected — applications open when the Airtable key is set. ]
            </p>
          )}

          <Field id="name" label="Name" error={errorFor('name')}>
            <input
              id="name"
              className={styles.input}
              type="text"
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={Boolean(errorFor('name'))}
              aria-describedby={describedBy('name')}
            />
          </Field>

          <Field id="email" label="Email" error={errorFor('email')}>
            <input
              id="email"
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
              aria-invalid={Boolean(errorFor('email'))}
              aria-describedby={describedBy('email')}
            />
          </Field>

          <Field id="why" label="Why you" error={errorFor('why')}>
            <textarea
              id="why"
              className={styles.textarea}
              name="why"
              rows={4}
              value={values.why}
              onChange={(e) => update('why', e.target.value)}
              aria-invalid={Boolean(errorFor('why'))}
              aria-describedby={describedBy('why')}
            />
          </Field>

          {/* Honeypot. Off-screen, named so no autofill heuristic matches it,
              and never validated — the server alone decides what a filled one
              means. */}
          <div className={styles.honeypot} aria-hidden="true">
            <label htmlFor="confirm_ref">Leave this field empty</label>
            <input
              id="confirm_ref"
              type="text"
              name="confirm_ref"
              tabIndex={-1}
              autoComplete="off"
              value={values.confirmRef}
              onChange={(e) => update('confirmRef', e.target.value)}
            />
          </div>

          {message ? (
            <p
              className={`${styles.error} t-micro`}
              role="alert"
              style={{ marginBottom: '1.5rem' }}
            >
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
          <Link href="/aude">← Back</Link>
        </p>
      </div>
    </div>
  )
}
