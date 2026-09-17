import { useLocation, useParams } from 'react-router-dom'
import {
  HubFormPanel,
  HubSwapFallbackPanel,
  HubsDetailPanel,
  HubsPanel,
} from '@features/hubs'

export default function HubsPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()
  const isEdit = Boolean(id && pathname.endsWith('/edit'))
  const isSwap = Boolean(id && pathname.endsWith('/swap'))

  if (id === 'new') return <HubFormPanel />
  if (isEdit && id) return <HubFormPanel hubId={id} />
  if (isSwap && id) return <HubSwapFallbackPanel />
  if (id) return <HubsDetailPanel id={id} />
  return <HubsPanel />
}
