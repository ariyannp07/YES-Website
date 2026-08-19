'use client'

import { useEffect, useState } from 'react'

import {
  CONFIRMATION,
  EnterSubmission,
  ROLES,
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

const EMPTY = {
  name: '',
  email: '',
  affiliation: '',
  role: 'builder' as Role,
  building: '',
  catalogConsent: false,
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

    const candidate = { ...values, source }
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
          [ Not connected — submissions open when the Airtable key is set. ]
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

      <label className={styles.field}>
        <span className={`${styles.label} t-micro`}>
          Affiliation — class year, school, or how you know Yale
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

      <fieldset
        className={styles.field}
        style={{ border: 0, margin: '0 0 2.75rem', padding: 0 }}
      >
        <legend className={`${styles.label} t-micro`} style={{ padding: 0 }}>
          You are a
        </legend>
        <div className={styles.choices}>
          {ROLES.map((role) => (
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
          What have you built, or what do you want to build?
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

      <label className={`${styles.field} ${styles.consent}`}>
        <input
          type="checkbox"
          name="catalogConsent"
          checked={values.catalogConsent}
          onChange={(event) => update('catalogConsent', event.target.checked)}
        />
        <span>List me in the public catalog of Yale builders.</span>
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
        {status === 'submitting' ? 'Sending…' : 'Enter →'}
      </button>
    </form>
  )
}
