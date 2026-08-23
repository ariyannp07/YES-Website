'use client'

import { useState } from 'react'

import { initialsOf } from '@/components/alumni/monogram'

import styles from './catalog.module.css'

/** On-brand gradients, chosen by name hash — from the yes-catalog scaffold. */
const GRADIENTS: readonly (readonly [string, string])[] = [
  ['#00356b', '#2a6fc4'],
  ['#0b2a52', '#4a8fe0'],
  ['#122142', '#5b6ee0'],
  ['#052c47', '#1f7ea8'],
  ['#1a1f4d', '#3f57c9'],
  ['#00294f', '#6da8e8'],
] as const

const gradientFor = (name: string): readonly [string, string] => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}

interface ProfileImageProps {
  readonly name: string
  readonly photo?: string
  readonly className?: string
}

/**
 * The portrait, or a monogram when there isn't one.
 *
 * Most of the directory has no portrait: the people are current students whose
 * photographs are not on the open web, and nothing is invented to fill the gap.
 * The monogram is therefore the normal case rather than an error state, and it
 * is styled to look deliberate — initials in the display serif over a gradient
 * keyed to the name, so the wall stays varied instead of showing 80 identical
 * grey busts.
 *
 * `onError` also falls back, so a portrait that 404s degrades to the same
 * treatment rather than a broken-image glyph.
 */
export function ProfileImage({ name, photo, className }: ProfileImageProps) {
  const [broken, setBroken] = useState(false)

  if (!photo || broken) {
    const [from, to] = gradientFor(name)
    return (
      <div
        className={`${styles.monogram} ${className ?? ''}`}
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
        aria-hidden="true"
      >
        <span className={styles.monogramSheen} />
        <span className={styles.monogramText}>{initialsOf(name)}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setBroken(true)}
      className={className}
    />
  )
}
