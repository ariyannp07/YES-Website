import type { Metadata } from 'next'

import { COMMON_ROOM_LINE, COMMON_ROOM_PEOPLE } from '@/content/common-room'

import styles from './common-room.module.css'

export const metadata: Metadata = {
  title: 'Common Room',
  description: COMMON_ROOM_LINE,
}

/**
 * The page dropped its "Pending" badge when the owners supplied the line and
 * the faces. Names and roles come from content/common-room.ts, which reads them
 * off the catalog so the two cannot drift.
 */
export default function CommonRoomPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Common Room</h1>
        <p className={styles.line}>{COMMON_ROOM_LINE}</p>
      </header>

      <ul className={styles.grid}>
        {COMMON_ROOM_PEOPLE.map((person) => (
          <li key={person.slug} className={styles.person}>
            <img
              className={styles.portrait}
              src={person.portrait}
              alt={person.name}
              width={560}
              height={560}
              loading="lazy"
            />
            <div>
              <span className={styles.name}>{person.name}</span>
              {person.role ? <p className={styles.role}>{person.role}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
