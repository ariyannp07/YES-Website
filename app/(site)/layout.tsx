export default function SiteLayout({
  children,
  dossier,
}: Readonly<{ children: React.ReactNode; dossier: React.ReactNode }>) {
  return (
    <>
      {children}
      {dossier}
    </>
  )
}
