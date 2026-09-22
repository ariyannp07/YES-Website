import type { Metadata } from 'next'
import { CommonRoomPeople } from '@/components/common-room-people'

import {
  COMMON_ROOM_LINE,
  COMMON_ROOM_PEOPLE,
  COMMON_ROOM_VALUATION,
} from '@/content/common-room'

import styles from './common-room.module.css'

export const metadata: Metadata = {
  title: 'Common Room',
  description: COMMON_ROOM_LINE,
}

/**
 * Owner-curated faces and roles, with sourced biographies in a compact dialog.
 */
export default function CommonRoomPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Common Room</h1>
        <p className={styles.line}>{COMMON_ROOM_LINE}</p>
      </header>

      <p className={styles.valuation}>
        <strong>{COMMON_ROOM_VALUATION.figure}</strong>
        <span>{COMMON_ROOM_VALUATION.context}</span>
      </p>

      <CommonRoomPeople people={COMMON_ROOM_PEOPLE} />
    </div>
  )
}
