import { useParams } from 'react-router-dom'
import { CasesPanel } from '@features/cases/CasesPanel'
import { CasesDetailPanel } from '@features/cases/CasesDetailPanel'

export default function CasesPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <CasesDetailPanel />
  return <CasesPanel />
}
