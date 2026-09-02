import { ProfileImage } from '@/components/catalog/profile-image'
import type { Alumnus } from '@/lib/alumni'

import styles from './dossier.module.css'

export function Dossier({ person }: { readonly person: Alumnus }) {
  return (
    <div className={styles.dossier}>
      <header className={styles.header}>
        <div className={styles.portrait}>
          <ProfileImage name={person.name} photo={person.portraitColor} />
        </div>
        <div className={styles.intro}>
          <p>{person.classYear}</p>
          <h1>{person.name}</h1>
          <span>{person.nowLine}</span>
        </div>
      </header>

      <section className={styles.proof} aria-label="Selected proof">
        <ProofBlock person={person} />
      </section>

      <div className={styles.story}>
        {person.bio ? <p>{person.bio}</p> : null}
        {person.ownWords ? <blockquote>“{person.ownWords}”</blockquote> : null}
        <DossierLinks person={person} />
      </div>
    </div>
  )
}

function ProofBlock({ person }: { readonly person: Alumnus }) {
  const { proof } = person

  if (proof.kind === 'image') {
    return (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proof.value} alt="" />
        {proof.source ? <figcaption>{proof.source}</figcaption> : null}
      </figure>
    )
  }

  if (proof.kind === 'link') {
    return (
      <a href={proof.value} rel="noreferrer noopener" target="_blank">
        {proof.source ?? proof.value} ↗
      </a>
    )
  }

  return (
    <div>
      <p>{proof.value}</p>
      {proof.source ? <span>{proof.source}</span> : null}
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
    <nav className={styles.links} aria-label={`${person.name} links`}>
      {links.map((link) => (
        <a key={link.href} href={link.href} rel="noreferrer noopener" target="_blank">
          {link.label} ↗
        </a>
      ))}
    </nav>
  )
}
