import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { useSmsTemplatesConfig, type SmsTemplateRow } from './useUssdConfig'

const TEMPLATE_HEADERS: TableHeader[] = [
  { key: 'name', label: 'TEMPLATE' },
  { key: 'trigger', label: 'CODE' },
  { key: 'preview', label: 'PREVIEW' },
  { key: 'len', label: 'LENGTH' },
  { key: 'status', label: 'STATUS' },
]

export function UssdTemplatesTab({
  search,
  matchesStatus,
  onFilter,
  searchQuery,
  setSearchQuery,
  paginate,
}: {
  search: string
  matchesStatus: (status: string) => boolean
  onFilter: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  paginate: <T>(rows: T[]) => {
    pageRows: T[]
    pagination: import('@shared/components').TablePaginationConfig
  }
}) {
  const navigate = useNavigate()
  const { data, isPending, isError } = useSmsTemplatesConfig()

  const templates = useMemo(() => {
    const all = data?.effective.templates ?? []
    const q = search.toLowerCase()
    return all.filter(
      (t) =>
        matchesStatus(t.status) &&
        (t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q)),
    )
  }, [data, search, matchesStatus])

  const { pageRows, pagination } = paginate(templates)

  if (isPending) return <LoadingState variant="inline" cols={5} rows={6} />
  if (isError) {
    return (
      <p className="p-4 text-[13px] text-[var(--mu)]">
        Could not load SMS templates (need accounts:manage).
      </p>
    )
  }

  return (
    <DynamicTableSection<SmsTemplateRow>
      variant="embedded"
      headers={TEMPLATE_HEADERS}
      data={pageRows}
      pagination={pagination}
      getRowKey={(item) => item.code}
      toolbar={{
        title: 'SMS templates (live config)',
        searchQuery,
        onSearchChange: setSearchQuery,
        searchPlaceholder: 'Search templates…',
        onFilter,
        showFilter: true,
        actions: (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            className="bg-[var(--pr)] hover:opacity-90"
            onClick={() => navigate('/ussd/new')}
          >
            Propose template
          </Button>
        ),
      }}
      onRowClick={(item) => navigate(`/ussd/${item.code}`)}
      renderItems={(item) => [
        <span key="name" className="text-xs font-bold text-[var(--tx)]">
          {item.name}
        </span>,
        <span key="tr" className="font-mono text-xs text-[var(--mu)]">
          {item.code}
        </span>,
        <span key="prev" className="max-w-[280px] truncate text-xs text-[var(--mu)]">
          {item.body}
        </span>,
        <span key="len" className="font-mono text-xs text-[var(--tx)]">
          {item.body.length}
        </span>,
        <TableStatusBadge
          key="st"
          label={item.status}
          tone={item.status === 'ACTIVE' ? 'success' : 'warning'}
        />,
      ]}
    />
  )
}
