'use client'

import type { FeatureExtractionPipeline } from '@huggingface/transformers'

/**
 * Query embedding, in the browser. Ported from the yes-catalog scaffold.
 *
 * Uses the SAME model and options as scripts/embed-catalog.ts — all-MiniLM-L6-v2
 * at q8, mean pooling, L2 normalized. If these ever drift apart the cosine
 * scores silently become meaningless, so they are stated in both files and in
 * lib/catalog/embed-text.ts.
 *
 * The library is @huggingface/transformers, the maintained successor to
 * @xenova/transformers. The older package cannot be bundled by Turbopack: its
 * entry throws "Cannot convert undefined or null to object" during import,
 * before any model fetch is attempted, so search degraded silently to keyword
 * matching.
 *
 * Why in the browser at all: it needs no API key, no server route and no
 * per-search cost, it keeps what people search for on their own machine, and it
 * still works if every third-party API is down. The price is a ~22MB model
 * download, which is why it is fetched lazily and why the field stays usable
 * (local substring filtering) the entire time it is loading.
 */

export const MODEL = 'Xenova/all-MiniLM-L6-v2'

export interface ModelProgress {
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly pct: number
}

type Listener = (progress: ModelProgress) => void

let pipePromise: Promise<FeatureExtractionPipeline> | null = null
const perFile = new Map<string, { loaded: number; total: number }>()
const listeners = new Set<Listener>()
let state: ModelProgress = { status: 'idle', pct: 0 }

export const modelState = (): ModelProgress => state

export const onModelProgress = (fn: Listener): (() => void) => {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

const emit = (patch: Partial<ModelProgress>): void => {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

interface ProgressEvent {
  status?: string
  file?: string
  loaded?: number
  total?: number
}

const handleProgress = (event: ProgressEvent): void => {
  if (event.status !== 'progress' || !event.file) return
  perFile.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 })
  let loaded = 0
  let total = 0
  for (const file of perFile.values()) {
    loaded += file.loaded
    total += file.total
  }
  if (total > 0) emit({ status: 'loading', pct: Math.min(99, (loaded / total) * 100) })
}

export const getEmbedder = (): Promise<FeatureExtractionPipeline> => {
  if (!pipePromise) {
    emit({ status: 'loading', pct: 0 })
    pipePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      const pipe = await pipeline('feature-extraction', MODEL, {
        dtype: 'q8',
        progress_callback: handleProgress,
      })
      emit({ status: 'ready', pct: 100 })
      return pipe
    })().catch((error: unknown) => {
      // Reset so a later search can retry rather than being stuck on a
      // transient network failure. Log it: search silently degrading to
      // keyword matching is exactly the kind of failure nobody notices.
      pipePromise = null
      emit({ status: 'error' })
      console.error('[catalog] embedding model failed to load', error)
      throw error
    })
  }
  return pipePromise
}

export const embedQuery = async (query: string): Promise<readonly number[]> => {
  const pipe = await getEmbedder()
  const out = await pipe(query, { pooling: 'mean', normalize: true })
  return Array.from(out.data as Float32Array)
}
