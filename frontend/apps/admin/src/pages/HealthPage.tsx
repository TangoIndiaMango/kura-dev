import { useParams } from 'react-router-dom'
import { HealthPanel } from '@features/health/HealthPanel'
import { HealthDetailPanel } from '@features/health/HealthDetailPanel'

export default function HealthPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <HealthDetailPanel />
  return <HealthPanel />
}
