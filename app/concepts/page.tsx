import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Landing prototypes',
}

/**
 * Comparison index for the three landing directions. Review-only — this route
 * and everything under it comes out once a direction is chosen.
 */
const CONCEPT_NOTES = [
  {
    slug: 'signal',
    number: '01',
    name: 'The Signal',
    line: 'A hidden network, scanned with the cursor.',
    body: 'Opens on one pulsing point in near-black. Moving the mouse exposes nodes and edges around it; over ten seconds an ambient floor rises and the field densifies on its own. Half the nodes are sampled from inside the YES mark, so the shape surfaces as a density rather than a logo. Disciplines occasionally collide and propose something neither would have alone. Click a bright node for its proof.',
    tech: 'Canvas 2D · no WebGL · ~6KB of logic',
  },
  {
    slug: 'blueprint',
    number: '02',
    name: 'The Infinite Blueprint',
    line: 'The collective notebook of Yale’s builders.',
    body: 'A working wall far larger than the viewport: gear studies, trace layouts, plots being re-fitted, massing models, UI frames, equations, ideas crossed out. Three parallax layers; the cursor shifts the viewing angle, and scrolling carries the camera diagonally across and into the drawing. Fragments animate on a long stagger. The name is drawn into the wall, not floated over it.',
    tech: 'Canvas 2D · 420 procedural fragments · no WebGL',
  },
  {
    slug: 'portal',
    number: '03',
    name: 'The Portal',
    line: 'A way into an impossible studio.',
    body: 'A cobalt slit in near-black parts to reveal an architectural space behind the page — grids, receding frames, suspended structures, things part-assembled in the distance. Scroll dollies the camera through the opening; the cursor shifts the perspective. The way in stays hidden until you look toward the bottom of the page.',
    tech: 'Three.js · scroll-driven camera',
  },
] as const

export default function ConceptsIndex() {
  return (
    <main
      className="page-top"
      style={{
        maxWidth: '52rem',
        marginInline: 'auto',
        padding: '0 var(--pad) calc(var(--pad) * 2)',
      }}
    >
      <p className="t-micro" style={{ color: 'var(--muted)', margin: '0 0 0.75rem' }}>
        Review only
      </p>

      <h1 className="t-display" style={{ margin: '0 0 1.25rem' }}>
        Three landing directions
      </h1>

      <p
        className="t-small measure"
        style={{ margin: '0 0 4rem', color: 'var(--muted)', lineHeight: 1.8 }}
      >
        Built as working prototypes rather than mockups — open each one and use
        it. The current front door is untouched at{' '}
        <Link href="/">/</Link>. None of these shares its composition.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {CONCEPT_NOTES.map((concept) => (
          <li
            key={concept.slug}
            style={{ marginBottom: 'clamp(3.5rem, 9vh, 5.5rem)' }}
          >
            <p
              className="t-micro"
              style={{ color: 'var(--muted)', margin: '0 0 0.75rem' }}
            >
              {concept.number}
            </p>

            <h2 className="t-display" style={{ margin: '0 0 0.9rem' }}>
              <Link href={`/concepts/${concept.slug}`}>{concept.name}</Link>
            </h2>

            <p className="t-small measure" style={{ margin: '0 0 1rem' }}>
              {concept.line}
            </p>

            <p
              className="t-small measure"
              style={{ margin: '0 0 1rem', color: 'var(--muted)', lineHeight: 1.8 }}
            >
              {concept.body}
            </p>

            <p className="t-micro" style={{ color: 'var(--muted)', margin: 0 }}>
              {concept.tech}
            </p>
          </li>
        ))}
      </ol>
    </main>
  )
}
