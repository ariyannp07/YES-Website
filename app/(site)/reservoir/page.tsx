import { permanentRedirect } from 'next/navigation'

export default function LegacyPage() {
  permanentRedirect('/writing#press')
}
