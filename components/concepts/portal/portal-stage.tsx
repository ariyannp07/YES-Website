'use client'

import Link from 'next/link'
import { useRef } from 'react'

import PortalScene from './portal-scene'
import styles from './portal.module.css'

/**
 * Threshold copy. Held in refs and driven from the render loop rather than from
 * React state, so the fade tracks the camera frame-for-frame without a re-render
 * on every scroll event.
 */
export function PortalStage() {
  const copyRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <PortalScene copyRef={copyRef} revealRef={revealRef} />

      <div ref={copyRef} className={styles.copy} data-scope="portal-threshold">
        <p className={styles.headline}>Build something.</p>
        <p className={`${styles.sub} t-micro`}>Yale Entrepreneurial Society</p>
      </div>

      <div ref={revealRef} className={`${styles.reveal} t-micro`}>
        <Link href="/manifesto">Manifesto</Link>
      </div>
    </>
  )
}
