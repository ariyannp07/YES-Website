/**
 * Palette selection.
 *
 * Build spec §4 asks for two candidate directions, rendered as pages, so the
 * owners choose from screens rather than descriptions. Both ship in the CSS;
 * which one is live is a single environment variable, so the decision costs one
 * redeploy and no code change.
 */

export const PALETTES = ['night', 'paper'] as const

export type Palette = (typeof PALETTES)[number]

export const DEFAULT_PALETTE: Palette = 'night'

export const PALETTE_LABELS: Readonly<Record<Palette, string>> = {
  night: 'Night',
  paper: 'Paper',
}

const isPalette = (value: string | undefined): value is Palette =>
  value !== undefined && (PALETTES as readonly string[]).includes(value)

/**
 * Resolve the build-time palette. An unrecognised value falls back to the
 * default rather than rendering an unstyled page.
 */
export const resolvePalette = (value: string | undefined): Palette =>
  isPalette(value) ? value : DEFAULT_PALETTE

/**
 * The preview-only palette switcher is opt-in. Production ships without it, so
 * the landing keeps its "nothing moves except the clock" budget.
 */
export const paletteToggleEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_SHOW_PALETTE_TOGGLE === 'true'
