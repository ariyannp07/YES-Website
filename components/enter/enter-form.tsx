'use client'

import { useEffect, useState } from 'react'

import {
  CONFIRMATION,
  EnterSubmission,
  ROLE_LABELS,
  resolveSource,
  type Role,
  type Source,
} from '@/lib/enter-schema'

import styles from './enter-form.module.css'

/**
 * The single intake form (build spec §3).
 *
 * The source parameter is read from the URL on the client rather than from
 * server searchParams, so the page stays static: the Bazaar QR points at
 * /enter?src=bazaar and the web link defaults to src=web.
 */

type Status = 'idle' | 'submitting' | 'done' | 'error'
type FieldErrors = Partial<Record<string, readonly string[]>>
const ASSOCIATE_ROLES = ['backer', 'helper'] as const satisfies readonly Role[]

const EMPTY = {
  name: '',
  email: '',
  affiliation: '',
  role: 'backer' as Role,
  building: '',
  confirmRef: '',
}

export function EnterForm({ connected }: { readonly connected: boolean }) {
  const [values, setValues] = useState(EMPTY)
  const [source, setSource] = useState<Source>('web')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSource(resolveSource(params.get('src')))
  }, [])

  // Immutable updates only — every change produces a new state object.
  const update = <K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K],
  ) => setValues((previous) => ({ ...previous, [key]: value }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('submitting')
    setFieldErrors({})
    setMessage('')

    const candidate = { ...values, catalogConsent: false, source }
    const parsed = EnterSubmission.safeParse(candidate)

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      // Without this the only role="alert" never renders and a screen-reader
      // user gets no feedback at all when the submit fails validation.
      setMessage('Something did not go through. Check the fields below.')
      setStatus('error')
      return
    }

    try {
      const response = await fetch('/api/enter', {
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
      <p className="t-display" style={{ margin: 0 }}>
        {CONFIRMATION}
      </p>
    )
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0]

  return (
    <form
      method="post"
      className={`${styles.form} t-small`}
      onSubmit={onSubmit}
      noValidate
    >
      {connected ? null : (
        <p className={`${styles.notice} t-micro`}>
          Submissions are unavailable in this preview because the intake service is not connected.
        </p>
      )}

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={`${styles.label} t-micro`}>Name</span>
          <input
            className={styles.input}
            type="text"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
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
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={Boolean(errorFor('email'))}
          />
          {errorFor('email') ? (
            <span className={`${styles.error} t-micro`}>{errorFor('email')}</span>
          ) : null}
        </label>
      </div>

      <label className={styles.field}>
        <span className={`${styles.label} t-micro`}>
          Affiliation
        </span>
        <input
          className={styles.input}
          type="text"
          name="affiliation"
          value={values.affiliation}
          onChange={(event) => update('affiliation', event.target.value)}
          aria-invalid={Boolean(errorFor('affiliation'))}
        />
        {errorFor('affiliation') ? (
          <span className={`${styles.error} t-micro`}>
            {errorFor('affiliation')}
          </span>
        ) : null}
      </label>

      <fieldset className={`${styles.field} ${styles.fieldset}`}>
        <legend className={`${styles.label} t-micro`}>
          How would you like to contribute?
        </legend>
        <div className={styles.choices}>
          {ASSOCIATE_ROLES.map((role) => (
            <label key={role} className={styles.choice}>
              <input
                type="radio"
                name="role"
                value={role}
                checked={values.role === role}
                onChange={() => update('role', role)}
              />
              <span>{ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.field}>
        <span className={`${styles.label} t-micro`}>
          What can you offer?
        </span>
        <textarea
          className={styles.textarea}
          name="building"
          rows={4}
          value={values.building}
          onChange={(event) => update('building', event.target.value)}
          aria-invalid={Boolean(errorFor('building'))}
        />
        {errorFor('building') ? (
          <span className={`${styles.error} t-micro`}>
            {errorFor('building')}
          </span>
        ) : null}
      </label>

      {/* Honeypot. Off-screen, unlabelled to autofill heuristics, never validated —
          the server decides what a filled one means. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="confirm_ref">Leave this field empty</label>
        <input
          id="confirm_ref"
          type="text"
          name="confirm_ref"
          tabIndex={-1}
          autoComplete="off"
          value={values.confirmRef}
          onChange={(event) => update('confirmRef', event.target.value)}
        />
      </div>

      {message ? (
        <p className={`${styles.error} t-micro`} role="alert" style={{ marginBottom: '1.5rem' }}>
          {message}
        </p>
      ) : null}

      <button
        className={styles.submit}
        type="submit"
        disabled={status === 'submitting' || !connected}
      >
        {status === 'submitting' ? 'Sending…' : 'Connect with YES'}
      </button>
    </form>
  )
}
