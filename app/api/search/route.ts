import { NextResponse } from 'next/server'
import { z } from 'zod'

import { clientKey, hit } from '@/lib/rate-limit'
import { searchCorpus } from '@/lib/search-corpus'

/**
 * Semantic search over the builder directory, via Grok.
 *
 * The key is read server-side only and never reaches the browser — the same
 * rule as the Airtable token. The client sends a query string and gets back
 * slugs; it never sees the model, the corpus or the credential.
 *
 * Model choice is deliberate: grok-4.6 answers this correctly but spends ~2.1k
 * reasoning tokens and takes ~36s, which is unusable in a search box. The
 * non-reasoning model returns the same top matches in ~1.3s.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODEL = 'grok-4.20-0309-non-reasoning'
const MAX_RESULTS = 12
const SEARCHES_PER_MINUTE = 20
const TIMEOUT_MS = 15_000

const SearchRequest = z.object({
  query: z.string().trim().min(2).max(200),
})

const SYSTEM = [
  'You match a natural-language query against a directory of Yale builders.',
  `Reply ONLY with JSON: {"slugs":[...]} — at most ${MAX_RESULTS} slugs, best match first.`,
  'Use only slugs that appear in the directory. If nothing genuinely matches, return {"slugs":[]}.',
  'Do not invent people. Do not add prose, explanation or markdown.',
].join(' ')

export async function POST(request: Request) {
  const limit = hit(`search:${clientKey(request.headers)}`, SEARCHES_PER_MINUTE)
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many searches. Wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const key = process.env.XAI_API_KEY
  if (!key) {
    // Not configured is not an error: the client falls back to plain filtering.
    return NextResponse.json({ ok: false, reason: 'unconfigured', slugs: [] }, { status: 503 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Bad request.' }, { status: 400 })
  }

  const parsed = SearchRequest.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Bad query.' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `DIRECTORY (slug | name | year | role | sectors | bio):\n${searchCorpus()}\n\nQUERY: ${parsed.data.query}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`[search] xAI ${response.status}: ${detail.slice(0, 300)}`)
      return NextResponse.json({ ok: false, slugs: [] }, { status: 502 })
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = body.choices?.[0]?.message?.content ?? ''

    // The model is instructed to return bare JSON, but never trust that.
    const match = /\{[\s\S]*\}/.exec(content)
    if (!match) {
      console.error('[search] no JSON in model reply')
      return NextResponse.json({ ok: false, slugs: [] }, { status: 502 })
    }

    const raw: unknown = JSON.parse(match[0])
    const slugs = z
      .object({ slugs: z.array(z.string()) })
      .safeParse(raw)

    if (!slugs.success) {
      return NextResponse.json({ ok: false, slugs: [] }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      slugs: slugs.data.slugs.slice(0, MAX_RESULTS),
    })
  } catch (error: unknown) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    console.error(`[search] ${aborted ? 'timed out' : 'failed'}:`, error)
    return NextResponse.json({ ok: false, slugs: [] }, { status: aborted ? 504 : 502 })
  } finally {
    clearTimeout(timer)
  }
}
