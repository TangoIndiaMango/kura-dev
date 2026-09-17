import { useParams } from 'react-router-dom'
import { RevenuePanel } from '@features/revenue/RevenuePanel'
import { RevenueDetailPanel } from '@features/revenue/RevenueDetailPanel'

export default function RevenuePage() {
  const { id } = useParams<{ id?: string }>()
  if (id) return <RevenueDetailPanel id={id} />
  return <RevenuePanel />
}
