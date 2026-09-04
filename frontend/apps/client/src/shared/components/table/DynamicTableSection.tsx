import { Box, LoadingOverlay, Table, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { EmptySection } from '../empty-state/EmptySection'
import { LoadingState } from './LoadingState'
import { TablePagination } from './TablePagination'
import { TableToolbar } from './TableToolbar'
import type { TableHeader, TablePaginationConfig, TableToolbarConfig } from './types'

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
  className?: string
  /** standalone = bordered card; embedded = fits inside an existing card */
  variant?: 'standalone' | 'embedded'
  fetching?: boolean
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
  className,
  variant = 'standalone',
  fetching = false,
}: DynamicTableSectionProps<T>) {
  const renderRowContent = (item: T) => {
    const content = renderItems(item, headers)

    return content.map((value, index) => (
      <Table.Td
        key={headers[index]?.key ?? index}
        className="whitespace-nowrap border-b border-[#EAECF0] py-4 align-middle text-sm font-medium text-[#101828]"
      >
        {value}
      </Table.Td>
    ))
  }

  const resolveRowKey = (item: T, index: number) =>
    getRowKey?.(item, index) ?? index

  return (
    <div
      className={[
        'overflow-hidden bg-white',
        variant === 'standalone'
          ? 'rounded-xl border border-[#EAECF0]'
          : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {toolbar && <TableToolbar {...toolbar} />}

      <Box pos="relative">
        <LoadingOverlay
          visible={fetching && !loading}
          zIndex={5}
          overlayProps={{ blur: 1, backgroundOpacity: 0.35 }}
        />

      {loading ? (
        <LoadingState cols={headers.length} variant="inline" />
      ) : !data || data.length === 0 ? (
        <EmptySection
          title={emptyTitle}
          description={emptyMessage}
          icon={emptyIcon}
          format="secondary"
        />
      ) : (
        <>
          <div className="hidden sm:block">
            <div className="w-full overflow-x-auto">
              <Table
                verticalSpacing="md"
                horizontalSpacing="lg"
                className="min-w-max w-full border-collapse text-left"
              >
                <Table.Thead className="border-b border-[#EAECF0] bg-[#F9FAFB]">
                  <Table.Tr>
                    {headers.map((header) => (
                      <Table.Th
                        key={header.key}
                        className="whitespace-nowrap py-3 text-xs font-medium text-[#667085]"
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
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                      className={[
                        'transition-colors duration-150 hover:bg-[#F9FAFB]',
                        onRowClick ? 'cursor-pointer' : undefined,
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
          </div>

          <div className="space-y-4 bg-[#F9FAFB] p-4 sm:hidden">
            {data.map((item, index) => {
              const content = renderItems(item, headers)

              return (
                <div
                  key={resolveRowKey(item, index)}
                  className="interactive-card space-y-3 rounded-lg border border-[#EAECF0] bg-white p-4 shadow-sm"
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {headers.map((header, headerIndex) => (
                    <div key={header.key}>
                      <Text fw={500} size="xs" className="mb-1 text-[#667085]">
                        {header.label}
                      </Text>
                      <div className="text-sm font-medium text-[#101828]">
                        {content[headerIndex]}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {pagination && <TablePagination {...pagination} />}
        </>
      )}
      </Box>
    </div>
  )
}
