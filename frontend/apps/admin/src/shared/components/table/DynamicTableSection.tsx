import { ActionIcon, Table } from '@mantine/core'
import type { MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ViewIcon } from 'hugeicons-react'
import { EmptySection } from '../empty-state/EmptySection'
import { LoadingState } from './LoadingState'
import { TablePagination } from './TablePagination'
import { TableToolbar } from './TableToolbar'
import type { TableHeader, TablePaginationConfig, TableToolbarConfig } from './types'

const ROW_ACTION_HEADER: TableHeader = { key: '_rowAction', label: '' }

export function TableRowViewButton({
  onClick,
  to,
  label = 'View details',
}: {
  onClick?: () => void
  to?: string
  label?: string
}) {
  if (to) {
    return (
      <ActionIcon
        component={Link}
        to={to}
        variant="subtle"
        color="gray"
        size="md"
        radius="md"
        aria-label={label}
        title={label}
        onClick={(e) => e.stopPropagation()}
      >
        <ViewIcon size={18} className="pointer-events-none" />
      </ActionIcon>
    )
  }

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="md"
      radius="md"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick?.()
      }}
    >
      <ViewIcon size={18} className="pointer-events-none" />
    </ActionIcon>
  )
}

interface DynamicTableSectionProps<T> {
  headers: TableHeader[]
  data: T[]
  loading?: boolean
  renderItems: (item: T, headers: TableHeader[]) => ReactNode[]
  getRowKey?: (item: T, index: number) => string | number
  emptyMessage?: string
  emptyTitle?: string
  emptyIcon?: ReactNode
  toolbar?: TableToolbarConfig
  pagination?: TablePaginationConfig
  onRowClick?: (item: T) => void
  /** Prefer this for row/eye navigation — uses React Router Link (reliable). */
  getRowHref?: (item: T) => string
  showRowAction?: boolean
  rowActionLabel?: string
  className?: string
  variant?: 'standalone' | 'embedded'
}

export function DynamicTableSection<T>({
  headers,
  data,
  loading = false,
  renderItems,
  getRowKey,
  emptyMessage = 'No records found',
  emptyTitle = 'No Records Found',
  emptyIcon,
  toolbar,
  pagination,
  onRowClick,
  getRowHref,
  showRowAction,
  rowActionLabel = 'View details',
  className,
  variant = 'standalone',
}: DynamicTableSectionProps<T>) {
  const navigate = useNavigate()
  const rowInteractive = Boolean(onRowClick || getRowHref)
  const includeRowAction =
    rowInteractive &&
    showRowAction !== false &&
    !headers.some((h) => h.key === '_rowAction')

  const displayHeaders = includeRowAction
    ? [...headers, ROW_ACTION_HEADER]
    : headers

  const openRow = (item: T) => {
    if (getRowHref) {
      navigate(getRowHref(item))
      return
    }
    onRowClick?.(item)
  }

  const onRowActivate = (item: T, e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('a, button, input, textarea, select, [role="menu"]')) {
      return
    }
    openRow(item)
  }

  const renderRowContent = (item: T) => {
    const content = [...renderItems(item, headers)]
    if (includeRowAction) {
      content.push(
        <TableRowViewButton
          key="_rowAction"
          label={rowActionLabel}
          to={getRowHref?.(item)}
          onClick={getRowHref ? undefined : () => openRow(item)}
        />,
      )
    }

    return content.map((value, index) => {
      const isAction = displayHeaders[index]?.key === '_rowAction'
      return (
        <Table.Td
          key={displayHeaders[index]?.key ?? index}
          className={[
            'whitespace-nowrap border-b border-[var(--bd)] py-4 align-middle text-sm font-medium text-[var(--tx)]',
            isAction ? 'kura-row-action' : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {value}
        </Table.Td>
      )
    })
  }

  const resolveRowKey = (item: T, index: number) =>
    getRowKey?.(item, index) ?? index

  return (
    <div
      className={[
        'min-w-0 bg-[var(--sf)] text-[var(--tx)]',
        variant === 'standalone'
          ? 'rounded-xl border border-[var(--bd)]'
          : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {toolbar && <TableToolbar {...toolbar} />}

      {loading ? (
        <LoadingState cols={displayHeaders.length} variant="inline" />
      ) : !data || data.length === 0 ? (
        <EmptySection
          title={emptyTitle}
          description={emptyMessage}
          icon={emptyIcon}
          format="secondary"
        />
      ) : (
        <>
          <div className="kura-table-scroll">
            <Table
              verticalSpacing="md"
              horizontalSpacing="lg"
              className="kura-data-table min-w-max w-full border-collapse text-left"
            >
              <Table.Thead className="border-b border-[var(--bd)] bg-[var(--in)]">
                <Table.Tr>
                  {displayHeaders.map((header) => (
                    <Table.Th
                      key={header.key}
                      className={[
                        'whitespace-nowrap py-3 text-xs font-medium text-[var(--mu)]',
                        header.key === '_rowAction' ? 'kura-row-action' : undefined,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {header.label}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {data.map((item, index) => (
                  <Table.Tr
                    key={resolveRowKey(item, index)}
                    onClick={rowInteractive ? (e) => onRowActivate(item, e) : undefined}
                    className={[
                      'transition-colors duration-150 hover:bg-[var(--hv)]',
                      rowInteractive ? 'cursor-pointer' : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {renderRowContent(item)}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          {pagination && <TablePagination {...pagination} />}
        </>
      )}
    </div>
  )
}
