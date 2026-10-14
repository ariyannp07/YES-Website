import { pageMetadata } from '@/lib/seo'
import { CommonRoomPeople } from '@/components/common-room-people'

import {
  COMMON_ROOM_LINE,
  COMMON_ROOM_PEOPLE,
} from '@/content/common-room'

import styles from './common-room.module.css'

export const metadata = pageMetadata('/common-room', {
  title: 'Common Room',
  description: COMMON_ROOM_LINE,
})

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

      <CommonRoomPeople people={COMMON_ROOM_PEOPLE} />
    </div>
  )
}
