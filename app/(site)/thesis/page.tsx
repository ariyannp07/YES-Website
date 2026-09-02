import type { Metadata } from 'next'

import { MANIFESTO } from '@/content/manifesto'

import styles from './thesis.module.css'

export const metadata: Metadata = {
  title: 'The YES Thesis',
  description: 'What the Yale Entrepreneurial Society believes—and why Yale must build.',
}

export default function ThesisPage() {
  return (
    <article className={styles.page} data-thesis-page="">
      <div className={styles.paper}>
        <header className={styles.header}>
          <h1 className={styles.sectionName}>The YES Thesis</h1>
          <div className={styles.byline}>
            <p>Ariyan Patel and Sofia Teifeld</p>
            <span>Co-presidents, Yale Entrepreneurial Society</span>
          </div>
        </header>

        <div className={styles.body}>
          {MANIFESTO.blocks.map((block, index) => {
            if (block.kind === 'turn') {
              return (
                <p key={index} className={styles.turn}>
                  {block.text}
                </p>
              )
            }

            if (block.kind === 'stack') {
              return block.lines.map((line, lineIndex) => (
                <p key={`${index}-${lineIndex}`}>{line}</p>
              ))
            }

            return <p key={index}>{block.text}</p>
          })}
        </div>
      </div>
    </article>
  )
}
