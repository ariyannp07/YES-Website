/**
 * Placeholder portrait.
 *
 * Build spec §3: "Agent builds with placeholder silhouettes; real people appear
 * only from the approved feed." Deliberately a drawn bust rather than a stock
 * face — nothing on this wall should ever be mistaken for a person who has not
 * consented.
 *
 * Head, neck and shoulders are drawn as one connected form, and each tile gets
 * its own background tone, so the grid reads as a wall of duotone portraits
 * rather than as the same avatar icon repeated 28 times. Every value is derived
 * from the slug, so the wall is identical on the server and in the browser.
 */

const hashOf = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

/** Where the shoulders meet the neck. The head is sized to always reach it. */
const NECK_Y = 63

export function Silhouette({ seed }: { readonly seed: string }) {
  const hash = hashOf(seed)

  const headRadius = 14 + (hash % 5)
  // Anchored to the neck so the head never floats free of the shoulders.
  const headY = NECK_Y - headRadius + 1
  const shoulderHalf = 30 + ((hash >> 4) % 11)
  const neckHalf = 8 + ((hash >> 8) % 4)
  const shift = -4 + ((hash >> 12) % 9)
  // Per-tile luminance, the way a wall of real portraits varies.
  const tone = (0.03 + ((hash >> 16) % 10) * 0.011).toFixed(3)

  const cx = 50 + shift

  const shoulders = [
    `M${cx - shoulderHalf} 101`,
    `C${cx - shoulderHalf} ${NECK_Y + 17} ${cx - neckHalf - 4} ${NECK_Y} ${cx - neckHalf} ${NECK_Y - 2}`,
    `L${cx + neckHalf} ${NECK_Y - 2}`,
    `C${cx + neckHalf + 4} ${NECK_Y} ${cx + shoulderHalf} ${NECK_Y + 17} ${cx + shoulderHalf} 101`,
    'Z',
  ].join(' ')

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="var(--sil-bg)" />
      <rect width="100" height="100" fill="var(--sil-fg)" opacity={tone} />
      <circle cx={cx} cy={headY} r={headRadius} fill="var(--sil-fg)" />
      <path d={shoulders} fill="var(--sil-fg)" />
    </svg>
  )
}
