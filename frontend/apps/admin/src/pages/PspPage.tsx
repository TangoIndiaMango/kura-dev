import { useLocation } from 'react-router-dom'
import { PspPanel } from '@features/psp/PspPanel'
import { PspSettingsFormPanel } from '@features/psp/PspSettingsFormPanel'

export default function PspPage() {
  const { pathname } = useLocation()
  if (pathname.endsWith('/psp/edit')) return <PspSettingsFormPanel />
  return <PspPanel />
}
