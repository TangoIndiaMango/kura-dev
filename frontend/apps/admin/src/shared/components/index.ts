export {
  RouteLoadingFallback,
  DetailPageLoadingSkeleton,
  FormPageLoadingSkeleton,
  PageLoadingSkeleton,
} from './loading'

export { KuraLogo } from './KuraLogo'
export { IllustratedModalLayout } from './IllustratedModalLayout'
export { IllustratedFormModal } from './IllustratedFormModal'
export { IllustratedStatusModal } from './IllustratedStatusModal'
export { KuraIllustrationModal } from './KuraIllustrationModal'
export { ProgressMotionBar } from './ProgressMotionBar'
export { BatteryFillIllustration } from './BatteryFillIllustration'
export type { IllustratedModalLayoutProps } from './IllustratedModalLayout'
export type { IllustratedFormModalProps } from './IllustratedFormModal'
export type { IllustratedStatusModalProps } from './IllustratedStatusModal'
export type { KuraIllustrationModalProps } from './KuraIllustrationModal'

export { AdminKpiCard } from './admin/AdminKpiCard'
export type { AdminKpiCardProps, AdminKpiTone } from './admin/AdminKpiCard'
export { AdminModuleLayout } from './admin/AdminModuleLayout'
export type {
  AdminModuleLayoutProps,
  AdminModuleTab,
} from './admin/AdminModuleLayout'
export { AdminDetailPage } from './admin/AdminDetailPage'
export type {
  AdminDetailPageProps,
  AdminDetailRow,
  AdminDetailAction,
  AdminActivityItem,
  AdminNoteItem,
  AdminDetailTab,
  AdminDetailCrumb,
  AdminDetailLayout,
} from './admin/AdminDetailPage'
export { DetailPeekTrigger } from './admin/DetailPeekTrigger'
export { AuditTrailRail } from './admin/AuditTrailRail'
export type { AuditTrailItem, AuditTrailTone } from './admin/AuditTrailRail'
export { AdminConfirmModal } from './admin/AdminConfirmModal'
export type { AdminConfirmModalProps } from './admin/AdminConfirmModal'
export { DemoDataBanner } from './admin/DemoDataBanner'
export {
  VehicleTypeField,
  normalizeVehicleTypeCode,
  VEHICLE_TYPE_OPTIONS,
} from './admin/VehicleTypeField'
export { AdminFormSuccessModal } from './admin/AdminFormSuccessModal'
export type { AdminFormSuccessModalProps } from './admin/AdminFormSuccessModal'
export {
  useAdminModuleControls,
  readAdminFilter,
  matchesStatusFilter,
  matchesSelectFilter,
  defaultModuleDateRange,
  sliceTablePage,
} from './admin/useAdminModuleControls'
export type { AdminModuleControlsOptions } from './admin/useAdminModuleControls'

export {
  AdminLineChart,
  ADMIN_CHART_COLORS,
} from './charts/AdminLineChart'
export type {
  AdminLineChartProps,
  AdminLineSeries,
  AdminChartPoint,
} from './charts/AdminLineChart'
export { AdminBarChart } from './charts/AdminBarChart'
export type { AdminBarChartProps, AdminBarSeries } from './charts/AdminBarChart'
export { AdminDonutChart } from './charts/AdminDonutChart'
export type {
  AdminDonutChartProps,
  AdminDonutSlice,
} from './charts/AdminDonutChart'
export { AdminAreaChart } from './charts/AdminAreaChart'
export type {
  AdminAreaChartProps,
  AdminAreaSeries,
} from './charts/AdminAreaChart'

export { ADMIN_NAV_ICONS, getAdminNavIcon } from './nav/navIcons'
export type { AdminNavIcon } from './nav/navIcons'

export {
  KURA_ILLUSTRATIONS,
  illustrationSrc,
  getIllustrationMeta,
} from '../illustrations/catalog'
export type {
  KuraIllustrationId,
  KuraIllustrationMeta,
  KuraIllustrationTone,
} from '../illustrations/catalog'

export { DetailsDrawer } from './DetailsDrawer'
export type { DetailsDrawerProps, DetailsDrawerRow } from './DetailsDrawer'

export {
  ErrorBoundary,
  ErrorFallback,
  RouteErrorFallback,
  RouteErrorBoundary,
} from './error'
export type { ErrorFallbackProps } from './error'

export {
  DynamicTableSection,
  TableRowViewButton,
  LoadingState,
  TablePagination,
  TableStatusBadge,
  TableToolbar,
  getPaginationRange,
} from './table'
export type {
  TableHeader,
  TablePaginationConfig,
  TableToolbarConfig,
  TableExportFormat,
} from './table'

export {
  TableFilterModal,
  useTableFilterModal,
  toTableFilterQueryParams,
  createEmptyFilterValues,
  buildGeneralTableFilters,
  NAME_SORT_OPTIONS,
  VALUE_SORT_OPTIONS,
} from './table-filter'
export type {
  TableFilterDateRangeField,
  TableFilterFieldConfig,
  TableFilterModalProps,
  TableFilterMultiCheckboxField,
  TableFilterOption,
  TableFilterSelectField,
  TableFilterSortOption,
  TableFilterSortOrderField,
  TableFilterValue,
  TableFilterValues,
} from './table-filter'

export { EmptyState, EmptySection } from './empty-state'

export {
  DateRangePicker,
  DATE_RANGE_PRESETS,
  YEAR_RANGE_PRESETS,
  getPresets,
  getDateFromRange,
  getDateFromPresets,
  formatDateRangeDisplay,
  parseDateRangeInput,
} from './date-range'
export type {
  DateRangePickerProps,
  DateRangePreset,
  DateRangePresetType,
  DateRangeInput,
  DateRangeOutput,
} from './date-range'

export { UnderlineTabs } from './tabs'
export type { UnderlineTabItem } from './tabs'

export { RevealImage } from './media/RevealImage'
export { FilePreviewModal } from './media/FilePreviewModal'
export type { FilePreviewModalProps } from './media/FilePreviewModal'
export { MediaThumbGallery } from './media/MediaThumbGallery'
export type { MediaThumbItem } from './media/MediaThumbGallery'
export { NoteAttachmentThumb } from './media/NoteAttachmentThumb'
export { SidebarFormLayout } from './SidebarFormLayout'
export { SidebarFormAside } from './SidebarFormAside'
export { SidebarTipsList } from './SidebarTipsList'
export { FormShellLayout } from './FormShellLayout'
export type { FormShellLayoutProps } from './FormShellLayout'
export { FormFooterActions } from './FormFooterActions'
export {
  RichTextEditorField,
  getRichTextPlainText,
  isRichTextEmpty,
} from './rich-text'
export { FormStepper } from './FormStepper'
export type { FormStepItem, FormStepperProps } from './FormStepper'
export { GoBackLink } from './GoBackLink'
export { MediaDropzone } from './media-upload/MediaDropzone'
export {
  CompactMediaSlot,
  DocumentSidesUpload,
  CustodyPhotosUpload,
} from './media-upload/CompactMediaSlot'
export type {
  CompactMediaSlotProps,
  DocumentSidesUploadProps,
  CustodyPhotosUploadProps,
  CustodyPhotoSlotId,
} from './media-upload/CompactMediaSlot'
