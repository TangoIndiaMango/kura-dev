import { useParams } from 'react-router-dom'
import { SwapsDetailPanel } from '@features/swaps/SwapsDetailPanel'
import { SwapsPanel } from '@features/swaps/SwapsPanel'

export default function SwapsPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <SwapsDetailPanel id={id} />
  return <SwapsPanel />
}
