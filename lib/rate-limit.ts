/**
 * A small fixed-window rate limiter for the intake route.
 *
 * LIMITATION, stated rather than hidden: this counts in the memory of one
 * serverless instance. Vercel may run several, so the effective limit is
 * per-instance, not global. It stops a naive flood from one client, not a
 * distributed one. Moving to Upstash or Vercel KV is a drop-in replacement for
 * `hit()` and nothing else changes.
 *
 * Combined with the form's honeypot, this is the whole bot defence — no
 * CAPTCHA, which would be off-genre on this site.
 */

interface Window {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5
const MAX_TRACKED_KEYS = 5000

const windows = new Map<string, Window>()

const sweep = (now: number): void => {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

export interface RateLimitResult {
  readonly allowed: boolean
  readonly retryAfterSeconds: number
}

export const hit = (key: string, max = MAX_PER_WINDOW): RateLimitResult => {
  const now = Date.now()

  // Bound memory: a flood of unique keys must not grow the map without limit.
  if (windows.size > MAX_TRACKED_KEYS) sweep(now)

  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  existing.count += 1

  if (existing.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Best-effort client identity from proxy headers. */
export const clientKey = (headers: Headers): string => {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
