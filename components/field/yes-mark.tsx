import { createRandom } from '@/lib/seeded-random'

/**
 * The YES mark: a blocked sigma carrying a low-poly network mesh.
 *
 * PLACEHOLDER GEOMETRY — traced from the mark the owners supplied, not the
 * original file. Drop the real vector at `public/marks/yes-logo.svg` and set
 * NEXT_PUBLIC_YES_LOGO_SVG=/marks/yes-logo.svg; the 3D rig picks it up and this
 * drawing stops being used. Nothing else changes.
 *
 * The mesh is generated from a fixed seed rather than hand-drawn, so the server
 * and the browser produce the same nodes and the page never mismatches on
 * hydration.
 */

/** Top bar, rightward chevron, bottom bar — the sigma silhouette. */
export const SIGMA_PATH =
  'M8,10 L92,10 L92,27 L8,27 Z ' +
  'M8,33 L44,33 L80,50 L44,67 L8,67 L44,50 Z ' +
  'M8,73 L92,73 L92,90 L8,90 Z'

const MESH_SEED = 4172
const NODE_COUNT = 54
/** Nodes closer than this (in viewBox units) get an edge between them. */
const EDGE_DISTANCE = 21

interface Node {
  readonly x: number
  readonly y: number
  readonly r: number
}

const buildNodes = (): readonly Node[] => {
  const random = createRandom(MESH_SEED)

  return Array.from({ length: NODE_COUNT }, () => ({
    x: Number((4 + random() * 92).toFixed(2)),
    y: Number((6 + random() * 88).toFixed(2)),
    r: Number((0.7 + random() * 1.1).toFixed(2)),
  }))
}

const buildEdges = (
  nodes: readonly Node[],
): readonly (readonly [Node, Node])[] => {
  const edges: (readonly [Node, Node])[] = []

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      if (Math.hypot(dx, dy) <= EDGE_DISTANCE) edges.push([nodes[i], nodes[j]])
    }
  }

  return edges
}

const NODES = buildNodes()
const EDGES = buildEdges(NODES)

/**
 * `detail` draws the full mesh; `solid` is the flat silhouette used for the
 * extrusion layers, where mesh detail would be invisible and expensive.
 */
export function YesMark({
  variant = 'detail',
  idPrefix = 'yes',
}: {
  readonly variant?: 'detail' | 'solid'
  readonly idPrefix?: string
}) {
  const clipId = `${idPrefix}-clip`

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {variant === 'detail' ? (
        <defs>
          <clipPath id={clipId}>
            <path d={SIGMA_PATH} />
          </clipPath>
        </defs>
      ) : null}

      <path d={SIGMA_PATH} fill="var(--mark-face)" />

      {variant === 'detail' ? (
        <g clipPath={`url(#${clipId})`}>
          {EDGES.map(([a, b], index) => (
            <line
              key={index}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--mark-line)"
              strokeWidth="0.35"
              opacity="0.75"
            />
          ))}
          {NODES.map((node, index) => (
            <circle
              key={index}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill="var(--mark-line)"
            />
          ))}
        </g>
      ) : null}
    </svg>
  )
}
