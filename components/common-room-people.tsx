'use client'

import { useEffect, useRef, useState } from 'react'

import type { CommonRoomPerson } from '@/content/common-room'
import { COMMON_ROOM_BIOS, HACKER_HOUSE_URL } from '@/content/common-room-bios'

import gridStyles from '@/app/(site)/common-room/common-room.module.css'
import styles from './common-room-people.module.css'

export function CommonRoomPeople({ people }: { readonly people: readonly CommonRoomPerson[] }) {
  const [selected, setSelected] = useState<CommonRoomPerson | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!selected) return
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [selected])

  return (
    <>
      <ul className={gridStyles.grid}>
        {people.map((person) => (
          <li key={person.slug} className={gridStyles.person}>
            <button
              type="button"
              className={styles.portraitButton}
              aria-label={`Read about ${person.name}`}
              aria-haspopup="dialog"
              onClick={() => setSelected(person)}
            >
              <img
                className={gridStyles.portrait}
                src={person.portrait}
                alt={person.name}
                width={560}
                height={560}
                loading="lazy"
              />
            </button>
            <div>
              <span className={gridStyles.name}>{person.name}</span>
              {person.role ? <p className={gridStyles.role}>{person.role}</p> : null}
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="common-room-bio-name"
        aria-describedby="common-room-bio-text"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect()
            if (event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom) {
              dialogRef.current?.close()
            }
          }
        }}
      >
        {selected ? (
          <div className={styles.panel}>
            <button
              type="button"
              className={styles.close}
              aria-label="Close biography"
              onClick={() => dialogRef.current?.close()}
            >
              Close ×
            </button>
            <h2 id="common-room-bio-name" className={styles.name}>{selected.name}</h2>
            <p id="common-room-bio-text" className={styles.bio}>
              {COMMON_ROOM_BIOS[selected.slug] ?? selected.role}
            </p>
            {COMMON_ROOM_BIOS[selected.slug] ? (
              <a className={styles.source} href={`${HACKER_HOUSE_URL}/#founders`} target="_blank" rel="noreferrer noopener">
                Yale Hacker House profile ↗
              </a>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  )
}
