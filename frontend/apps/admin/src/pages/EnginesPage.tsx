import { useLocation, useParams } from 'react-router-dom'
import {
  EBoarderFormPanel,
  EBoardersPanel,
  EngineFormPanel,
  EnginesDetailPanel,
  EnginesPanel,
} from '@features/engines'

export default function EnginesPage() {
  const { id, eboarderId } = useParams<{
    id?: string
    eboarderId?: string
  }>()
  const { pathname } = useLocation()
  const onEboarders = pathname.includes('/engines/eboarders')

  if (onEboarders) {
    if (
      pathname.endsWith('/eboarders/new') ||
      pathname.endsWith('/eboarders/new/')
    ) {
      return <EBoarderFormPanel />
    }
    if (eboarderId && pathname.endsWith('/edit')) {
      return <EBoarderFormPanel eboarderId={eboarderId} />
    }
    return <EBoardersPanel />
  }

  if (pathname.endsWith('/engines/new') || id === 'new') {
    return <EngineFormPanel />
  }
  if (id && pathname.endsWith('/edit')) {
    return <EngineFormPanel resumeRetrofitId={id} />
  }
  if (id) return <EnginesDetailPanel id={id} />
  return <EnginesPanel />
}
