import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Menu, Textarea } from '@mantine/core'
import { ArrowLeft01Icon, ArrowDown01Icon } from 'hugeicons-react'
import { AdminKpiCard, type AdminKpiCardProps } from './AdminKpiCard'
import { KuraIllustrationModal } from '../KuraIllustrationModal'
import { NoteAttachmentThumb } from '../media/NoteAttachmentThumb'
import { useUrlTab } from '../../hooks/useUrlTab'

export interface AdminDetailRow {
  label: string
  value: ReactNode
}

export interface AdminDetailAction {
  id: string
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export interface AdminActivityItem {
  id: string
  title: string
  detail?: string
  at: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentContentType?: string | null
}

export interface AdminNoteItem {
  id: string
  body: string
  author: string
  at: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentContentType?: string | null
}

export interface AdminDetailTab {
  id: string
  label: string
  count?: number
  content: ReactNode
}

export interface AdminDetailCrumb {
  label: string
  to?: string
}

export type AdminDetailLayout = 'record' | 'receipt' | 'timeline'

export interface AdminDetailPageProps {
  backLabel?: string
  onBack: () => void
  /** Optional trail above the title — prefer links over duplicating fields. */
  breadcrumbs?: AdminDetailCrumb[]
  title: string
  subtitle?: string
  statusLabel?: string
  statusTone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  actions?: AdminDetailAction[]
  summaryRows?: AdminDetailRow[]
  /** Optional secondary meta — prefer one scannable Summary over Summary+Details twins. */
  detailRows?: AdminDetailRow[]
  summaryTitle?: string
  detailTitle?: string
  entityKpis?: AdminKpiCardProps[]
  /** record = classic split; receipt = amount-first stack; timeline = children-first */
  layout?: AdminDetailLayout
  trendSlot?: ReactNode
  trendTitle?: string
  relatedSlot?: ReactNode
  relatedTitle?: string
  /** Hero strip for receipts (amount, channel chip, etc.) */
  heroSlot?: ReactNode
  tabs?: AdminDetailTab[]
  /**
   * Default tab when `?tab=` is absent. Prefer linking with `?tab=people` —
   * detail tabs sync to the URL automatically.
   */
  initialTab?: string
  activity?: AdminActivityItem[]
  /** When set, replaces the activity list (e.g. status stepper). */
  activitySlot?: ReactNode
  activityTitle?: string
  notes?: AdminNoteItem[]
  notesTitle?: string
  onSaveNote?: (body: string) => void
  noteSuccessDescription?: string
  /**
   * Opt-in only. Most entities should omit Activity — enable for case/ops threads.
   */
  showActivity?: boolean
  /**
   * Opt-in only (like NHEF Tasks). Do not enable from onSaveNote alone.
   */
  showNotes?: boolean
  /** Optional control row above KPIs (e.g. DateRangePicker for time-scoped stats). */
  kpiToolbar?: ReactNode
  children?: ReactNode
}

const STATUS_PILL: Record<
  NonNullable<AdminDetailPageProps['statusTone']>,
  string
> = {
  default: 'bg-[var(--tn)] text-[var(--mu)]',
  success: 'bg-[var(--tg)] text-[#1E8E4E]',
  warning: 'bg-[var(--ta)] text-[#C47D0E]',
  danger: 'bg-[var(--tr)] text-[#C0392B]',
  info: 'bg-[var(--tb)] text-[var(--pr)]',
  neutral: 'bg-[var(--tn)] text-[var(--mu)]',
}

function MetaRows({ rows }: { rows: AdminDetailRow[] }) {
  if (rows.length === 0) return null
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            {row.label}
          </dt>
          <dd className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SectionCard({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] ${className}`}
    >
      {title ? (
        <h2 className="mb-3 text-[14px] font-bold text-[var(--tx)]">{title}</h2>
      ) : null}
      {children}
    </section>
  )
}

export function AdminDetailPage({
  backLabel = 'Back',
  onBack,
  breadcrumbs,
  title,
  subtitle,
  statusLabel,
  statusTone = 'default',
  actions = [],
  summaryRows = [],
  detailRows = [],
  summaryTitle = 'Summary',
  detailTitle = 'Details',
  entityKpis = [],
  layout = 'record',
  trendSlot,
  trendTitle = 'Trend',
  relatedSlot,
  relatedTitle = 'Related',
  heroSlot,
  tabs,
  initialTab,
  activity = [],
  activitySlot,
  activityTitle = 'Activity',
  notes = [],
  notesTitle = 'Notes',
  onSaveNote,
  noteSuccessDescription,
  showActivity = false,
  showNotes = false,
  kpiToolbar,
  children,
}: AdminDetailPageProps) {
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSuccessOpen, setNoteSuccessOpen] = useState(false)

  const tabIds = useMemo(() => tabs?.map((t) => t.id) ?? [], [tabs])
  /** First tab is the URL default (param omitted). Prefer `?tab=` over `initialTab`. */
  const defaultTabId = tabIds[0] ?? initialTab ?? 'overview'
  const [activeTab, setActiveTab] = useUrlTab(defaultTabId, {
    valid: tabIds.length > 0 ? tabIds : undefined,
  })

  const notesEnabled = showNotes && Boolean(onSaveNote || notes.length > 0)
  const activityEnabled =
    showActivity && (Boolean(activitySlot) || activity.length > 0)
  const showRail =
    activityEnabled || notesEnabled || Boolean(relatedSlot)
  const currentTab =
    tabs && tabs.length > 0
      ? (tabs.find((t) => t.id === activeTab) ?? tabs[0])
      : undefined

  const handleSaveNote = () => {
    const trimmed = noteDraft.trim()
    if (!trimmed || !onSaveNote) return
    onSaveNote(trimmed)
    setNoteDraft('')
    setNoteSuccessOpen(true)
  }

  const rail = showRail ? (
    <div className="flex flex-col gap-4">
      {relatedSlot && layout !== 'record' ? (
        <SectionCard title={relatedTitle}>{relatedSlot}</SectionCard>
      ) : null}

      {activityEnabled ? (
        <SectionCard title={activityTitle}>
          {activitySlot ? (
            activitySlot
          ) : activity.length === 0 ? (
            <p className="text-[13px] text-[var(--mu)]">No activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-[var(--bd)] pb-3 last:border-0 last:pb-0"
                >
                  <div className="text-[13px] font-semibold text-[var(--tx)]">{item.title}</div>
                  {item.detail ? (
                    <div className="mt-0.5 text-[12.5px] text-[var(--mu)]">{item.detail}</div>
                  ) : null}
                  {item.attachmentUrl ? (
                    <NoteAttachmentThumb
                      url={item.attachmentUrl}
                      label={item.attachmentName ?? undefined}
                      contentType={item.attachmentContentType}
                    />
                  ) : null}
                  <div className="mt-1 text-[11px] text-[var(--su)]">{item.at}</div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {notesEnabled ? (
        <SectionCard title={notesTitle}>
          {notes.length > 0 ? (
            <ul className="mb-3 flex flex-col gap-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-[8px] border border-[var(--bd)] bg-[var(--in)] p-3"
                >
                  <p className="text-[13px] text-[var(--tx)]">{note.body}</p>
                  {note.attachmentUrl ? (
                    <NoteAttachmentThumb
                      url={note.attachmentUrl}
                      label={note.attachmentName ?? undefined}
                      contentType={note.attachmentContentType}
                    />
                  ) : null}
                  <div className="mt-1.5 text-[11px] text-[var(--su)]">
                    {note.author} · {note.at}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-[13px] text-[var(--mu)]">No notes yet.</p>
          )}

          {onSaveNote ? (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Add an internal note…"
                minRows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.currentTarget.value)}
                styles={{
                  input: {
                    background: 'var(--in)',
                    borderColor: 'var(--bd)',
                    color: 'var(--tx)',
                  },
                }}
              />
              <Button
                onClick={handleSaveNote}
                disabled={!noteDraft.trim()}
                className="self-end bg-[var(--pr)] hover:opacity-90"
              >
                Save Note
              </Button>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  ) : null

  const tabsBlock =
    tabs && tabs.length > 0 ? (
      <SectionCard>
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--bd)]">
          {tabs.map((tab) => {
            const active = (currentTab?.id ?? '') === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px shrink-0 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'border-b-2 border-[var(--pr)] text-[var(--pr)]'
                    : 'border-b-2 border-transparent text-[var(--mu)] hover:text-[var(--tx)]'
                }`}
              >
                {tab.label}
                {tab.count != null ? (
                  <span className="ml-1.5 text-[11px] tabular-nums opacity-70">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        {currentTab?.content}
      </SectionCard>
    ) : null

  const mainColumn = (
    <div className="flex min-w-0 flex-col gap-4">
      {heroSlot}

      {/* timeline = children-first (station / ops shells) */}
      {layout === 'timeline' ? children : null}

      {summaryRows.length > 0 ? (
        <SectionCard title={summaryTitle}>
          <MetaRows rows={summaryRows} />
        </SectionCard>
      ) : null}

      {detailRows.length > 0 ? (
        <SectionCard title={detailTitle}>
          <MetaRows rows={detailRows} />
        </SectionCard>
      ) : null}

      {trendSlot ? <SectionCard title={trendTitle}>{trendSlot}</SectionCard> : null}

      {relatedSlot && layout === 'record' ? (
        <SectionCard title={relatedTitle}>{relatedSlot}</SectionCard>
      ) : null}

      {tabsBlock}

      {layout !== 'timeline' ? children : null}
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--mu)]">
                {breadcrumbs.map((crumb, i) => (
                  <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
                    {i > 0 ? <span aria-hidden>/</span> : null}
                    {crumb.to ? (
                      <Link to={crumb.to} className="font-semibold hover:text-[var(--pr)]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--tx)]">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            ) : (
              <button
                type="button"
                onClick={onBack}
                className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mu)] hover:text-[var(--pr)]"
              >
                <ArrowLeft01Icon size={16} />
                {backLabel}
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-[var(--tx)]">{title}</h1>
              {statusLabel ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_PILL[statusTone]}`}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>
            {subtitle ? (
              <p className="mt-1 text-[13px] text-[var(--mu)]">{subtitle}</p>
            ) : null}
          </div>

          {actions.length > 0 ? (
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <Button
                  rightSection={<ArrowDown01Icon size={14} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                >
                  Take Action
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {actions.map((action) => (
                  <Menu.Item
                    key={action.id}
                    disabled={action.disabled}
                    color={action.tone === 'danger' ? 'red' : undefined}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          ) : null}
        </div>

        {entityKpis.length > 0 || kpiToolbar ? (
          <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--bd)] bg-white p-4 shadow-[var(--sh)]">
            {kpiToolbar ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {kpiToolbar}
              </div>
            ) : null}
            {entityKpis.length > 0 ? (
              <div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {entityKpis.map((kpi) => (
                  <AdminKpiCard key={kpi.title} {...kpi} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {layout === 'receipt' || layout === 'timeline' || !showRail ? (
          <div className="flex flex-col gap-4">
            {mainColumn}
            {rail}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
            {mainColumn}
            {rail}
          </div>
        )}
      </div>

      {onSaveNote ? (
        <KuraIllustrationModal
          opened={noteSuccessOpen}
          onClose={() => setNoteSuccessOpen(false)}
          layout="center"
          illustrationId="note-added"
          description={noteSuccessDescription ?? title}
          primaryAction={{
            label: 'Done',
            onClick: () => setNoteSuccessOpen(false),
          }}
        />
      ) : null}
    </>
  )
}
