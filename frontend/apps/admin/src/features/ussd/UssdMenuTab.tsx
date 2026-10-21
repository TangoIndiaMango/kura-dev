import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { useUssdConfig } from './useUssdConfig'

const MENU_HEADERS: TableHeader[] = [
  { key: 'key', label: 'KEY' },
  { key: 'label', label: 'MENU ITEM' },
  { key: 'hint', label: 'FLOW' },
  { key: 'status', label: 'STATUS' },
]

type MenuRow = { key: string; label: string; flow: string }

export function UssdMenuTab() {
  const { data, isPending, isError } = useUssdConfig()

  if (isPending) return <LoadingState variant="inline" cols={4} rows={5} />
  if (isError || !data) {
    return (
      <p className="p-4 text-[13px] text-[var(--mu)]">
        Could not load USSD config (need accounts:manage).
      </p>
    )
  }

  const menu = data.effective.menu ?? {}
  const rows: MenuRow[] = Object.entries(menu).map(([key, item]) => ({
    key,
    label: item.label || key,
    flow: item.flow || '—',
  }))

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <p className="text-[12px] text-[var(--mu)]">
        Shortcode {data.effective.shortcode || '—'} ·{' '}
        {data.effective.enabled ? 'Enabled' : 'Disabled'} · published ConfigVersion
      </p>
      <DynamicTableSection<MenuRow>
        variant="embedded"
        headers={MENU_HEADERS}
        data={rows}
        getRowKey={(item) => item.key}
        showRowAction={false}
        toolbar={{ title: 'Operator menu (live)', showFilter: false }}
        renderItems={(node) => [
          <span key="k" className="font-mono text-xs text-[var(--mu)]">
            {node.key}
          </span>,
          <span key="l" className="text-xs font-bold text-[var(--tx)]">
            {node.label}
          </span>,
          <span key="h" className="text-xs text-[var(--mu)]">
            {node.flow}
          </span>,
          <TableStatusBadge
            key="st"
            label={data.effective.enabled ? 'Live' : 'Off'}
            tone={data.effective.enabled ? 'success' : 'warning'}
          />,
        ]}
      />
      <p className="text-[12px] text-[var(--mu)]">
        Menu text is published in KURA. Africa’s Talking callbacks our backend; Admin does
        not push menus to AT.
      </p>
    </div>
  )
}
