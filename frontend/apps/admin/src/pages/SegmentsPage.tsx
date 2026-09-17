import { useLocation, useParams } from 'react-router-dom'
import {
  SegmentFormPanel,
  SegmentsDetailPanel,
  SegmentsPanel,
} from '@features/segments'

export default function SegmentsPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()

  if (pathname.endsWith('/segments/new') || id === 'new') return <SegmentFormPanel />
  if (pathname.endsWith('/edit') && id) return <SegmentFormPanel segmentId={id} />
  if (id) return <SegmentsDetailPanel id={id} />
  return <SegmentsPanel />
}
