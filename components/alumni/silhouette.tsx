/**
 * Placeholder portrait.
 *
 * Build spec §3: "Agent builds with placeholder silhouettes; real people appear
 * only from the approved feed." Deliberately a drawn silhouette rather than a
 * stock face — nothing on this wall should ever be mistaken for a person who
 * has not consented.
 *
 * Shape varies deterministically by slug so the wall reads as a wall rather
 * than as one icon repeated 28 times.
 */

const hashOf = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

export function Silhouette({ seed }: { readonly seed: string }) {
  const hash = hashOf(seed)

  const headRadius = 15 + (hash % 5)
  const headY = 36 + ((hash >> 3) % 7)
  const shoulderRadiusX = 30 + ((hash >> 6) % 12)
  const shoulderRadiusY = 30 + ((hash >> 10) % 10)
  const shift = -3 + ((hash >> 13) % 7)

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
      <circle
        cx={50 + shift}
        cy={headY}
        r={headRadius}
        fill="var(--sil-fg)"
      />
      <ellipse
        cx={50 + shift}
        cy={108}
        rx={shoulderRadiusX}
        ry={shoulderRadiusY}
        fill="var(--sil-fg)"
      />
    </svg>
  )
}
