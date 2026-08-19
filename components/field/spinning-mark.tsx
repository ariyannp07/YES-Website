import { MarkMount } from '@/components/field/mark-mount'
import { SIGMA_PATH } from '@/lib/yes-geometry'

import styles from './mark.module.css'

/**
 * The YES mark on the front door.
 *
 * Server component. It renders a static sigma immediately — so the front door
 * has its subject in the very first HTML — and mounts the WebGL scene over the
 * top once its chunk arrives. If WebGL is unavailable or JavaScript never runs,
 * the static mark is simply what the page has, which is a perfectly good front
 * door.
 */
export function SpinningMark() {
  return (
    <div className={styles.stage}>
      <div className={styles.fallback} aria-hidden="true">
        <svg viewBox="0 0 100 100" focusable="false">
          <path d={SIGMA_PATH} fill="#1d59bd" />
        </svg>
      </div>

      <div className={styles.canvas}>
        <MarkMount />
      </div>

      <p className={`${styles.hint} t-micro`} aria-hidden="true">
        Drag to turn
      </p>
    </div>
  )
}
