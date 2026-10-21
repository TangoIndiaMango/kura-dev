import type { TablePaginationConfig } from '@shared/components'

export const ADMIN_LIST_PAGE_SIZE = 10

export function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Cursor feeds: Next disabled when API has no `next` (and not while placeholder).
 * Page label advances; totalPages = page when exhausted so Next matches UI disable.
 */
export function buildCursorPagination(opts: {
  page: number
  setPage: (page: number) => void
  cursor: string | undefined
  setCursor: (cursor: string | undefined) => void
  nextCursor: string | undefined
  previousCursor: string | undefined
  /** True while keepPreviousData is showing prior page — ignore stale next. */
  isPlaceholderData?: boolean
  pageSize?: number
}): TablePaginationConfig {
  const pageSize = opts.pageSize ?? ADMIN_LIST_PAGE_SIZE
  const hasNext = Boolean(opts.nextCursor) && !opts.isPlaceholderData
  const hasPrevious =
    (Boolean(opts.previousCursor) || Boolean(opts.cursor)) &&
    !opts.isPlaceholderData

  return {
    page: Math.max(1, opts.page),
    totalPages: hasNext ? opts.page + 1 : Math.max(1, opts.page),
    onPageChange: () => undefined,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
    hasNext,
    hasPrevious,
    onNext: hasNext
      ? () => {
          opts.setCursor(opts.nextCursor)
          opts.setPage(opts.page + 1)
        }
      : undefined,
    onPrevious: hasPrevious
      ? () => {
          if (opts.previousCursor) {
            opts.setCursor(opts.previousCursor)
            opts.setPage(Math.max(1, opts.page - 1))
          } else {
            opts.setCursor(undefined)
            opts.setPage(1)
          }
        }
      : undefined,
  }
}

/**
 * Page-number lists: drive UI from URL `page`, not stale keepPreviousData
 * `current_page`. Next disabled on last page / while placeholder.
 */
export function buildPagePagination(opts: {
  page: number
  setPage: (page: number) => void
  totalPages: number
  isPlaceholderData?: boolean
  pageSize?: number
}): TablePaginationConfig {
  const pageSize = opts.pageSize ?? ADMIN_LIST_PAGE_SIZE
  const page = Math.max(1, opts.page)
  const totalPages = Math.max(1, opts.totalPages)
  const hasNext = page < totalPages && !opts.isPlaceholderData
  const hasPrevious = page > 1 && !opts.isPlaceholderData

  return {
    page,
    totalPages,
    onPageChange: opts.setPage,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
    hasNext,
    hasPrevious,
  }
}
