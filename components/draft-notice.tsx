/**
 * Build spec §8.4: "Mark all copy drafts `DRAFT — AWAITING OWNER APPROVAL`.
 * Do not deploy copy to production without explicit owner sign-off."
 *
 * The notice is driven by the content module's own `approved` flag rather than
 * by an environment variable, so approval is a reviewable diff in the copy file
 * and cannot be silenced by a deploy setting.
 *
 * Set in the site's own grammar — bracketed micro type on the background. No
 * banner, no box, no colour-coded alert chrome.
 */
export function DraftNotice({
  approved,
  label,
}: {
  readonly approved: boolean
  readonly label: string
}) {
  if (approved) return null

  return (
    <p
      className="t-micro"
      style={{ color: 'var(--accent)', margin: '0 0 3.5rem' }}
    >
      [ {label} ]
    </p>
  )
}
