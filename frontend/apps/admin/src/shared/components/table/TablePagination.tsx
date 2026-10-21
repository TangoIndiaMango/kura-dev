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
          ? 'border-[var(--pr)] bg-[var(--pr)] text-white'
          : 'border-[var(--bd)] bg-[var(--sf)] text-[var(--mu)] hover:bg-[var(--hv)] hover:text-[var(--tx)] disabled:cursor-not-allowed disabled:opacity-50',
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
  hasNext,
  hasPrevious,
}: TablePaginationProps) {
  if (totalPages <= 1 && variant === 'numbered') {
    return null
  }

  const canPrev =
    hasPrevious !== undefined ? hasPrevious : page > 1
  const canNext =
    hasNext !== undefined ? hasNext : page < totalPages

  const goPrev = () => {
    if (!canPrev) return
    if (onPrevious) onPrevious()
    else onPageChange(Math.max(1, page - 1))
  }
  const goNext = () => {
    if (!canNext) return
    if (onNext) onNext()
    else onPageChange(Math.min(totalPages, page + 1))
  }

  if (variant === 'controls') {
    return (
      <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--bd)] bg-[var(--sf)] p-4 sm:flex-row">
        {onPageSizeChange && (
          <Group gap={8} className="text-sm font-medium text-[var(--mu)]">
            <Text span c="var(--mu)">
              Show
            </Text>
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
              styles={{
                input: {
                  backgroundColor: 'var(--in)',
                  borderColor: 'var(--bd)',
                  color: 'var(--tx)',
                },
              }}
            />
            <Text span c="var(--mu)">
              entries
            </Text>
          </Group>
        )}

        <Text fz="sm" c="var(--mu)" fw={500}>
          Page {page} of {totalPages}
        </Text>

        <div className="flex items-center overflow-hidden rounded-lg border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="flex items-center gap-2 border-r border-[var(--bd)] px-3.5 py-2 text-sm font-semibold text-[var(--tx)] transition-colors hover:bg-[var(--hv)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft01Icon size={16} />
            Previous
          </button>
          <div className="border-r border-[var(--bd)] bg-[var(--in)] px-4 py-2 text-sm font-semibold text-[var(--tx)]">
            {page}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[var(--tx)] transition-colors hover:bg-[var(--hv)] disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="border-t border-[var(--bd)] bg-[var(--sf)] px-4 py-4">
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
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[var(--bd)] bg-[var(--sf)] px-1 text-sm text-[var(--mu)]"
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
