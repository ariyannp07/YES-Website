import Link from 'next/link'

import { MANIFESTO } from '@/content/manifesto'
import { KIND_LABELS, allEntries } from '@/lib/reservoir'
import { pageMetadata } from '@/lib/seo'

import styles from './writing.module.css'
import pressStyles from '../reservoir/reservoir.module.css'

export const metadata = pageMetadata('/writing', {
  title: 'Thesis & Press',
  description: 'The YES thesis and press coverage of the Yale Entrepreneurial Society and its builders.',
})

export default function WritingPage() {
  const entries = allEntries()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Thesis &amp; Press</h1>
        <nav className={styles.sections} aria-label="Thesis and press sections">
          <a href="#thesis">The YES Thesis</a>
          <a href="#press">Press</a>
        </nav>
      </header>

      <article id="thesis" className={styles.thesis} aria-labelledby="thesis-heading">
        <h2 id="thesis-heading" className={styles.sectionHeading}>The YES Thesis</h2>
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
      </article>

      <section id="press" className={styles.press} aria-labelledby="press-heading">
        <h2 id="press-heading" className={styles.sectionHeading}>Press</h2>
        <p className={pressStyles.standfirst}>
          Coverage of the society and the people in it, newest first.
        </p>
        {entries.length === 0 ? (
          <p className={pressStyles.empty}>[ Nothing published yet. ]</p>
        ) : (
          <div className={pressStyles.list}>
            {entries.map((entry) => {
              const external = Boolean(entry.url)
              const label = entry.publication ?? KIND_LABELS[entry.kind]
              const body = (
                <>
                  <span className={pressStyles.date}>{entry.date}</span>
                  <strong>{entry.title}</strong>
                  <span className={pressStyles.source}>{label}</span>
                  <span className={pressStyles.arrow} aria-hidden="true">
                    {external ? '↗' : '→'}
                  </span>
                </>
              )
  
              return external ? (
                <a
                  key={entry.slug}
                  className={pressStyles.row}
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {body}
                </a>
              ) : (
                <Link
                  key={entry.slug}
                  className={pressStyles.row}
                  href={`/reservoir/${entry.slug}`}
                >
                  {body}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
