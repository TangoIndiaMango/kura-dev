import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import { useAgents, type AgentListRow } from './hooks/use-agents'
import { useShifts } from '@features/payments/hooks/use-cash-ops'

const HEADERS: TableHeader[] = [
  { key: 'name', label: 'AGENT' },
  { key: 'hub', label: 'HUB (OPEN SHIFT)' },
  { key: 'duty', label: 'DUTY' },
  { key: 'phone', label: 'PHONE' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

function statusTone(status: AgentListRow['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'INVITED') return 'warning' as const
  return 'danger' as const
}

export function AgentsPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'agents',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter agents',
    includeNameSort: false,
  })

  const statusRaw = controls.filterValues.status
  const status =
    statusRaw && statusRaw !== 'all' ? String(statusRaw) : undefined

  const { agents, isPending, count, currentPage, totalPages } = useAgents({
    search: controls.search || undefined,
    status,
    page: controls.page,
    page_size: 25,
  })

  const shiftsQuery = useShifts({ status: 'OPEN', page: 1, enabled: true })
  const openByAgent = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of shiftsQuery.data?.results ?? []) {
      map.set(s.agent_id, s.hub_code || s.hub_name)
    }
    return map
  }, [shiftsQuery.data?.results])

  const openCount = openByAgent.size

  return (
    <>
      <AdminModuleLayout
        title="Hub Operators"
        subtitle="Hub operators and attendants on shift roster"
        kpis={[
          { title: 'Hub Operators', value: count, sub: 'Field staff' },
          {
            title: 'Open shifts',
            value: openCount,
            sub: 'On duty now',
            tone: 'success',
          },
          {
            title: 'Invited',
            value: agents.filter((a) => a.status === 'INVITED').length,
            sub: 'On this page',
            tone: 'warning',
          },
          {
            title: 'Suspended',
            value: agents.filter((a) => a.status === 'SUSPENDED').length,
            sub: 'On this page',
            tone: 'danger',
          },
        ]}
      >
        {isPending ? (
          <Skeleton height={220} radius="md" />
        ) : (
          <DynamicTableSection<AgentListRow>
            variant="embedded"
            headers={HEADERS}
            data={agents}
            pagination={{
              page: currentPage,
              totalPages,
              onPageChange: controls.setPage,
              variant: 'controls',
              pageSize: '25',
            }}
            getRowKey={(a) => a.id}
            toolbar={{
              title: 'Hub operators',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search name, email, phone…',
              onFilter: controls.openFilter,
              showFilter: true,
              actions: can('users:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/agents/new')}
                >
                  Invite agent
                </Button>
              ) : undefined,
            }}
            onRowClick={(a) => navigate(`/agents/${a.id}`)}
            emptyTitle="No agents"
            emptyMessage="Invite a HUB_AGENT from Users or here."
            renderItems={(a) => {
              const hub = openByAgent.get(a.id)
              return [
                <span key="n" className="text-xs font-bold text-[var(--tx)]">
                  {a.name}
                </span>,
                <span key="h" className="font-mono text-xs text-[var(--mu)]">
                  {hub ?? '—'}
                </span>,
                <span key="d" className="text-xs text-[var(--mu)]">
                  {hub ? 'On duty' : 'Off duty'}
                </span>,
                <span key="p" className="text-xs text-[var(--mu)]">
                  {a.phone}
                </span>,
                <TableStatusBadge
                  key="s"
                  label={a.status}
                  tone={statusTone(a.status)}
                />,
              ]
            }}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
