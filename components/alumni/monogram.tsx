/**
 * Portrait stand-in: the person's initials.
 *
 * The supplied "portrait pack" turned out to contain 116 labelled placeholder
 * slots rather than photographs — 600×600 JPEGs reading e.g. "AP / Ariyan Patel
 * / FEATURED — RESOLVE". Shipping those would mean 1.8MB of images that say
 * less than their own filenames, so the same idea is drawn natively instead:
 * no assets, any resolution, and it swaps out cleanly the moment real portraits
 * land in the consented feed.
 *
 * Better than the generic silhouette it replaces, too — 116 identical busts
 * carry no information, whereas initials distinguish people at a glance.
 */

const INITIALS_MAX = 2

/** First and last initial, diacritics stripped so "Leïa" reads as "L". */
export const initialsOf = (name: string): string => {
  const words = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s-]+/)
    .filter((word) => /[A-Za-z]/.test(word))

  if (words.length === 0) return '·'

  const letters =
    words.length === 1
      ? [words[0][0]]
      : [words[0][0], words[words.length - 1][0]]

  return letters.join('').slice(0, INITIALS_MAX).toUpperCase()
}

export function Monogram({ name }: { readonly name: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="var(--sil-bg)" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--sil-fg)"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="34"
        letterSpacing="1"
      >
        {initialsOf(name)}
      </text>
    </svg>
  )
}
