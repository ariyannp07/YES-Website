import { SiteNav } from '@/components/site-nav'

/**
 * The interior shell. Everything past the front door shares one nav line and
 * the timestamp motif; nothing else is chrome.
 *
 * `dossier` is a parallel route slot. It is empty on every page except when a
 * face is clicked from the mosaic, at which point the intercepted route fills
 * it with the expanded dossier — over the wall, without leaving the page.
 */
export default function SiteLayout({
  children,
  dossier,
}: Readonly<{ children: React.ReactNode; dossier: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* The catalog paints a fixed particle field behind its content; without
          a stacking context of its own the nav would disappear underneath it. */}
      <div style={{ position: 'relative', zIndex: 30 }}>
        <SiteNav />
      </div>
      {/* A flex column so a page that wants the full remaining height can ask
          for it with flex: 1 — a percentage height cannot resolve here, because
          flex-1 leaves <main> stretched but without a definite height. Ordinary
          pages are unaffected: a single block child still lays out identically. */}
      <main
        className="flex-1"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0 var(--pad) calc(var(--pad) * 2)',
        }}
      >
        {children}
      </main>
      {dossier}
    </div>
  )
}
