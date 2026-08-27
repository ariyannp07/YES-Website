import type { Alumnus } from '@/lib/alumni'

/**
 * A dossier (build spec §3).
 *
 * Layout in the document grammar: no card chrome, plain type on the background,
 * display size for the proof and the name, small type for everything else.
 *
 * EDITORIAL RULES, binding on everything rendered here:
 *   · No adjectives describing a person. Accomplishments speak in nouns,
 *     numbers and artifacts. scripts/check-adjectives.mjs enforces this against
 *     the feed at build time rather than leaving it to a copy reviewer.
 *   · One proof object, not a résumé. Curation over completeness.
 *   · Own words are collected from the alum, never ghost-written.
 */
export function Dossier({ person }: { readonly person: Alumnus }) {
  return (
    <div className="measure">
      <p className="t-micro" style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
        {person.classYear}
      </p>

      <h1 className="t-display" style={{ margin: '0 0 1.5rem' }}>
        {person.name}
      </h1>

      <p className="t-small" style={{ margin: '0 0 3.5rem', lineHeight: 1.8 }}>
        {person.nowLine}
      </p>

      <ProofBlock person={person} />

      {/* The directory's description of the work. Third person and written
          about them, which is why it is set as plain prose and NOT folded into
          `ownWords` — those are quoted, and quoting a third-person paragraph
          would present it as something the person said. Without this the copy
          existed only as a three-line clamp on the catalog card and appeared in
          full nowhere on the site. */}
      {person.bio ? (
        <p className="t-small" style={{ margin: '3.5rem 0 0', lineHeight: 1.8 }}>
          {person.bio}
        </p>
      ) : null}

      {person.ownWords ? (
        <p
          className="t-small"
          style={{ margin: '3.5rem 0 0', lineHeight: 1.8 }}
        >
          “{person.ownWords}”
        </p>
      ) : null}

      <DossierLinks person={person} />
    </div>
  )
}

function ProofBlock({ person }: { readonly person: Alumnus }) {
  const { proof } = person

  if (proof.kind === 'image') {
    return (
      <figure style={{ margin: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proof.value}
          alt=""
          style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
        />
        {proof.source ? (
          <figcaption
            className="t-micro"
            style={{ color: 'var(--muted)', marginTop: '0.75rem' }}
          >
            {proof.source}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (proof.kind === 'link') {
    return (
      <p className="t-small" style={{ margin: 0 }}>
        <a href={proof.value} rel="noreferrer noopener" target="_blank">
          {proof.source ?? proof.value}
        </a>
      </p>
    )
  }

  // 'number' and 'headline' — the single most concrete artifact, in display type.
  return (
    <div>
      <p className="t-display" style={{ margin: 0 }}>
        {proof.value}
      </p>
      {proof.source ? (
        <p
          className="t-micro"
          style={{ color: 'var(--muted)', margin: '0.85rem 0 0' }}
        >
          {proof.source}
        </p>
      ) : null}
    </div>
  )
}

function DossierLinks({ person }: { readonly person: Alumnus }) {
  const links = [
    person.companyUrl ? { href: person.companyUrl, label: 'Company' } : null,
    person.linkedinUrl ? { href: person.linkedinUrl, label: 'LinkedIn' } : null,
  ].filter((link): link is { href: string; label: string } => link !== null)

  if (links.length === 0) return null

  return (
    <p className="t-small" style={{ margin: '3.5rem 0 0' }}>
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? <span style={{ opacity: 0.4 }}> · </span> : null}
          <a href={link.href} rel="noreferrer noopener" target="_blank">
            {link.label}
          </a>
        </span>
      ))}
    </p>
  )
}
