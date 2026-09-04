import type { ReactNode } from 'react'

export interface TableHeader {
  label: string
  key: string
}

export interface TablePaginationConfig {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** @default 'numbered' */
  variant?: 'numbered' | 'controls'
  pageSize?: string
  onPageSizeChange?: (size: string | null) => void
  onNext?: () => void
  onPrevious?: () => void
}

export type TableExportFormat = 'csv' | 'pdf'

export interface TableToolbarConfig {
  title: string
  searchQuery?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showFilter?: boolean
  showExport?: boolean
  onFilter?: () => void
  onExport?: () => void
  onExportFormat?: (format: TableExportFormat) => void
  isExporting?: boolean
  actions?: ReactNode
}
