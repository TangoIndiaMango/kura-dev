import { useParams } from 'react-router-dom'
import { RiskDetailPanel, RiskPanel } from '@features/risk'

export default function RiskPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <RiskDetailPanel />
  return <RiskPanel />
}
