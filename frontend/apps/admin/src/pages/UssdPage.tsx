import { useParams } from 'react-router-dom'
import { UssdPanel } from '@features/ussd/UssdPanel'
import { UssdDetailPanel } from '@features/ussd/UssdDetailPanel'
import { TemplateFormPanel } from '@features/ussd/TemplateFormPanel'

export default function UssdPage() {
  const { id } = useParams<{ id?: string }>()
  if (id === 'new') return <TemplateFormPanel />
  if (id) return <UssdDetailPanel />
  return <UssdPanel />
}
