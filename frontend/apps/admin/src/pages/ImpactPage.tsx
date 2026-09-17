import { useLocation, useParams } from 'react-router-dom'
import {
  ImpactDetailPanel,
  ImpactFormPanel,
  ImpactPanel,
} from '@features/impact'

export default function ImpactPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()

  if (pathname.endsWith('/impact/new') || id === 'new') return <ImpactFormPanel />
  if (pathname.endsWith('/edit') && id) return <ImpactFormPanel storyId={id} />
  if (id) return <ImpactDetailPanel />
  return <ImpactPanel />
}
