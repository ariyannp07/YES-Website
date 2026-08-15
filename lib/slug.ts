/**
 * Stable, linkable slugs. Build spec §3 requires each alum to have a stable URL
 * so a dossier can be dropped straight into outreach or press.
 */
export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Disambiguate collisions deterministically, so two people with the same name
 * keep the same URLs build over build.
 */
export const uniqueSlug = (
  base: string,
  taken: ReadonlySet<string>,
): string => {
  if (!taken.has(base)) return base

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }

  throw new Error(`Could not allocate a unique slug for "${base}".`)
}
