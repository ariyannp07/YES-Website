'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { CityView } from './city-view'
import GlobeCanvas from './globe-canvas'
import styles from './globe.module.css'

/**
 * Holds the descent.
 *
 * One clock drives both halves — the globe's camera dive and the city plate's
 * approach — because they have to read as a single continuous fall. Giving each
 * component its own timer would let them drift apart by a frame or two, which
 * is exactly where the illusion breaks.
 */

/** Seconds for the fall, and for the climb back out. */
const DIVE_IN = 2.1
const DIVE_OUT = 1.1

export function LandingStage({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const progress = useRef(0)
  const target = useRef(0)

  useEffect(() => {
    target.current = open ? 1 : 0
  }, [open])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const to = target.current
      const span = to > progress.current ? DIVE_IN : DIVE_OUT
      const step = dt / span
      progress.current =
        to > progress.current
          ? Math.min(to, progress.current + step)
          : Math.max(to, progress.current - step)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      <GlobeCanvas
        dive={progress}
        diveTarget="new-haven"
        onMarkerClick={(id) => {
          if (id === 'new-haven') setOpen(true)
        }}
      />

      <CityView progress={progress} open={open} />

      {open ? (
        <button type="button" className={styles.cityClose} onClick={close}>
          Back to Earth
        </button>
      ) : null}

      {/* The copy fades out on the way down; it belongs to the globe, not to
          the street. */}
      <div className={styles.copyWrap} data-dived={open ? 'true' : 'false'}>
        {children}
      </div>
    </>
  )
}
