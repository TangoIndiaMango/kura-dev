import { Group, Select, Text } from '@mantine/core'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from 'hugeicons-react'
import { getPaginationRange } from './get-pagination-range'
import type { TablePaginationConfig } from './types'

interface TablePaginationProps extends TablePaginationConfig {}

function PaginationButton({
  children,
  onClick,
  disabled,
  active = false,
  ariaLabel,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors',
        active
          ? 'border-[var(--mantine-color-brand-9)] bg-[var(--mantine-color-brand-9)] text-white'
          : 'border-[#D0D5DD] bg-white text-[#667085] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  variant = 'numbered',
  pageSize,
  onPageSizeChange,
  onNext,
  onPrevious,
}: TablePaginationProps) {
  if (totalPages <= 1 && variant === 'numbered') {
    return null
  }

  if (variant === 'controls') {
    return (
      <div className="flex flex-col items-center justify-between gap-4 border-t border-[#EAECF0] bg-white p-4 sm:flex-row">
        {onPageSizeChange && (
          <Group gap={8} className="text-sm font-medium text-[#475467]">
            <Text span>Show</Text>
            <Select
              data={['05', '10', '20', '50', '100']}
              value={pageSize || '10'}
              onChange={onPageSizeChange}
              allowDeselect={false}
              withCheckIcon={false}
              rightSectionPointerEvents="none"
              rightSection={<ArrowDown01Icon size={16} />}
              size="sm"
              radius="md"
              w={72}
              classNames={{
                input: 'font-semibold cursor-pointer',
              }}
            />
            <Text span>entries</Text>
          </Group>
        )}

        <Text fz="sm" c="#475467" fw={500}>
          Page {page} of {totalPages}
        </Text>

        <div className="flex items-center overflow-hidden rounded-lg border border-[#EAECF0] bg-white shadow-sm">
          <button
            type="button"
            onClick={onPrevious}
            disabled={page === 1}
            className="flex items-center gap-2 border-r border-[#EAECF0] px-3.5 py-2 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft01Icon size={16} />
            Previous
          </button>
          <div className="border-r border-[#EAECF0] bg-white px-4 py-2 text-sm font-semibold text-[#344054]">
            {page}
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ArrowRight01Icon size={16} />
          </button>
        </div>
      </div>
    )
  }

  const pages = getPaginationRange(page, totalPages)

  return (
    <div className="border-t border-[#EAECF0] bg-white px-4 py-4">
      <Group gap={4} justify="flex-start">
        <PaginationButton
          ariaLabel="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ArrowLeft01Icon size={16} />
        </PaginationButton>

        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[#D0D5DD] bg-white px-1 text-sm text-[#667085]"
            >
              ...
            </span>
          ) : (
            <PaginationButton
              key={item}
              active={item === page}
              onClick={() => onPageChange(item)}
              ariaLabel={`Go to page ${item}`}
            >
              {item}
            </PaginationButton>
          ),
        )}

        <PaginationButton
          ariaLabel="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          <ArrowRight01Icon size={16} />
        </PaginationButton>
      </Group>
    </div>
  )
}
