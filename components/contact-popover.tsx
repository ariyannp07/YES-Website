'use client'

import { useEffect, useId, useRef, useState } from 'react'

import styles from './contact-popover.module.css'

export function ContactPopover() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        Contact
      </button>

      {open ? (
        <div className={styles.panel} id={panelId} role="dialog" aria-label="Contact YES">
          <button
            type="button"
            className={styles.close}
            aria-label="Close contact details"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <span className={styles.eyebrow}>Contact</span>
          <strong>Ariyan Patel</strong>
          <span className={styles.role}>Co-President</span>
          <a href="mailto:ariyan.patel@yale.edu">ariyan.patel@yale.edu</a>
        </div>
      ) : null}
    </div>
  )
}
