/**
 * Abstract marks for the floating field.
 *
 * Build spec §1 offers two placeholder routes until logo permissions land:
 * abstract glyphs, or the words of the speech. Words were tried and rejected —
 * a field of floating adjectives is telling, and this page's entire argument is
 * showing. These read as logomarks: geometric, unexplained, no copy.
 *
 * They are placeholders with a real mechanism behind them. When a founder signs
 * off, add a `logo` entry to content/marks/approved.json and the SVG renders in
 * their place. Nothing else changes.
 */

export const GLYPH_SHAPES = [
  'ring',
  'disc',
  'triangle',
  'diamond',
  'arc',
  'concentric',
  'chevron',
  'hexagon',
  'cross',
  'bars',
  'half',
  'square',
  'dots',
  'slash',
  'lens',
  'orbit',
] as const

export type GlyphShape = (typeof GLYPH_SHAPES)[number]

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4.5,
} as const

const shapeFor = (shape: GlyphShape): React.ReactNode => {
  switch (shape) {
    case 'ring':
      return <circle cx="50" cy="50" r="38" {...STROKE} />
    case 'disc':
      return <circle cx="50" cy="50" r="33" fill="currentColor" />
    case 'triangle':
      return <path d="M50 13 L88 83 H12 Z" {...STROKE} strokeLinejoin="round" />
    case 'diamond':
      return (
        <path d="M50 9 L91 50 L50 91 L9 50 Z" {...STROKE} strokeLinejoin="round" />
      )
    case 'arc':
      return (
        <path d="M12 70 A38 38 0 0 1 88 70" {...STROKE} strokeLinecap="round" />
      )
    case 'concentric':
      return (
        <>
          <circle cx="50" cy="50" r="38" {...STROKE} />
          <circle cx="50" cy="50" r="15" fill="currentColor" />
        </>
      )
    case 'chevron':
      return (
        <path
          d="M18 34 L50 66 L82 34"
          {...STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'hexagon':
      return (
        <path
          d="M50 7 L87 28.5 L87 71.5 L50 93 L13 71.5 L13 28.5 Z"
          {...STROKE}
          strokeLinejoin="round"
        />
      )
    case 'cross':
      return (
        <path d="M50 12 V88 M12 50 H88" {...STROKE} strokeLinecap="round" />
      )
    case 'bars':
      return (
        <>
          <rect x="14" y="24" width="72" height="9" fill="currentColor" />
          <rect x="14" y="45.5" width="52" height="9" fill="currentColor" />
          <rect x="14" y="67" width="32" height="9" fill="currentColor" />
        </>
      )
    case 'half':
      return <path d="M50 12 A38 38 0 0 1 50 88 Z" fill="currentColor" />
    case 'square':
      return <rect x="13" y="13" width="74" height="74" rx="4" {...STROKE} />
    case 'dots':
      return (
        <>
          <circle cx="32" cy="32" r="11" fill="currentColor" />
          <circle cx="68" cy="32" r="11" fill="currentColor" />
          <circle cx="32" cy="68" r="11" fill="currentColor" />
          <circle cx="68" cy="68" r="11" fill="currentColor" />
        </>
      )
    case 'slash':
      return <path d="M20 82 L80 18" {...STROKE} strokeLinecap="round" />
    case 'lens':
      return (
        <path d="M50 10 A45 45 0 0 0 50 90 A45 45 0 0 0 50 10 Z" {...STROKE} />
      )
    case 'orbit':
      return (
        <>
          <ellipse cx="50" cy="50" rx="42" ry="19" {...STROKE} />
          <circle cx="50" cy="50" r="10" fill="currentColor" />
        </>
      )
  }
}

export function Glyph({
  shape,
  className,
}: {
  readonly shape: GlyphShape
  readonly className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {shapeFor(shape)}
    </svg>
  )
}
