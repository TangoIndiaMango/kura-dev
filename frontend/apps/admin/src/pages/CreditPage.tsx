import { useParams } from 'react-router-dom'
import { CreditPanel, CreditDetailPanel } from '@features/credit'

export default function CreditPage() {
  const { id } = useParams<{ id?: string }>()
  if (id) return <CreditDetailPanel id={id} />
  return <CreditPanel />
}
