import type { Metadata } from 'next'

import styles from './common-room.module.css'

export const metadata: Metadata = {
  title: 'Common Room — Pending',
  description: 'Common Room is pending.',
}

export default function CommonRoomPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className="status-pending">Pending</span>
        <h1>Common Room</h1>
      </section>
    </div>
  )
}
