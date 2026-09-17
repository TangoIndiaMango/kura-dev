import { useLocation, useParams } from 'react-router-dom'
import { AgentsDetailPanel } from '@features/agents/AgentsDetailPanel'
import { AgentsPanel } from '@features/agents/AgentsPanel'
import { AgentFormPanel } from '@features/agents/AgentFormPanel'

export default function AgentsPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()
  const isEdit = Boolean(id && pathname.endsWith('/edit'))

  if (id === 'new') return <AgentFormPanel />
  if (isEdit && id) return <AgentFormPanel agentId={id} />
  if (id) return <AgentsDetailPanel id={id} />
  return <AgentsPanel />
}
