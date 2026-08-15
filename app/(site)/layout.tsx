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
      <SiteNav />
      <main
        className="flex-1"
        style={{ padding: '0 var(--pad) calc(var(--pad) * 2)' }}
      >
        {children}
      </main>
      {dossier}
    </div>
  )
}
