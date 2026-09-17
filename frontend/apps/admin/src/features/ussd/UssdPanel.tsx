import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import {
  MOCK_AGENT_MENU,
  MOCK_OPERATOR_MENU,
  MOCK_TEMPLATES,
  type UssdMenuNode,
  type UssdTemplateRecord,
} from '@shared/mock/adminMockData'

/** Hifi · SMS Templates: Template · Trigger · Preview · Length · Status */
const TEMPLATE_HEADERS: TableHeader[] = [
  { key: 'name', label: 'TEMPLATE' },
  { key: 'trigger', label: 'TRIGGER' },
  { key: 'preview', label: 'PREVIEW' },
  { key: 'len', label: 'LENGTH' },
  { key: 'status', label: 'STATUS' },
]

const MENU_HEADERS: TableHeader[] = [
  { key: 'key', label: 'KEY' },
  { key: 'label', label: 'MENU ITEM' },
  { key: 'hint', label: 'FLOW' },
  { key: 'status', label: 'STATUS' },
]

const LANG_HEADERS: TableHeader[] = [
  { key: 'name', label: 'LANGUAGE' },
  { key: 'code', label: 'CODE' },
  { key: 'role', label: 'ROLE' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
]

/**
 * Product truth (PRD / SOW / kura-docs):
 * - MVP language = English only. Pidgin / Yoruba / Hausa = post-MVP.
 * - There is no “Add New Language” that talks to Africa’s Talking.
 * - Language packs are KURA ConfigVersion strings (menus + SMS), not AT language packs.
 * - Shortcode / MNO approval = AT dashboard (manual). Menus publish to KURA DB;
 *   AT callbacks our backend and we return the published menu text.
 */
const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    role: 'Primary · MVP',
    status: 'ACTIVE' as const,
  },
  {
    code: 'pcm',
    name: 'Pidgin',
    role: 'Roadmap · post-MVP',
    status: 'POST_MVP' as const,
  },
  {
    code: 'yo',
    name: 'Yoruba',
    role: 'Roadmap · post-MVP',
    status: 'POST_MVP' as const,
  },
  {
    code: 'ha',
    name: 'Hausa',
    role: 'Roadmap · post-MVP',
    status: 'POST_MVP' as const,
  },
]

/**
 * Matches KURA Admin Console hifi (G4 USSD & SMS).
 * Add New Template → full-bleed at /ussd/new.
 * Languages = status of KURA string packs — not an AT gateway control.
 */
export function UssdPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('menu')
  const [templates] = useState(MOCK_TEMPLATES)

  const controls = useAdminModuleControls({
    scope: 'ussd',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter templates',
  })

  const smsTemplates = useMemo(() => {
    const q = controls.search.toLowerCase()
    return templates.filter(
      (t) =>
        t.channel === 'SMS' &&
        controls.matchesStatus(t.status) &&
        (t.name.toLowerCase().includes(q) ||
          t.trigger.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q)),
    )
  }, [templates, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(smsTemplates)

  return (
    <>
      <AdminModuleLayout
        title="USSD & SMS"
        subtitle="Shortcode, menus & message templates"
        dateRangeSlot={controls.dateRangeSlot}
        tabs={[
          { id: 'menu', label: 'USSD Menu' },
          { id: 'templates', label: 'SMS Templates' },
          { id: 'languages', label: 'Languages' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={[
          {
            title: 'Shortcode',
            value: '*347*88#',
            sub: 'To be confirmed',
            tone: 'default',
          },
          { title: 'Session timeout', value: '90 s', sub: 'New sessions', tone: 'default' },
          {
            title: 'Templates',
            value: String(templates.filter((t) => t.channel === 'SMS').length),
            sub: 'SMS catalogue',
            tone: 'default',
          },
          {
            title: 'Languages',
            value: '1 · EN',
            sub: 'Pidgin, Yoruba, Hausa post-MVP',
            tone: 'warning',
          },
        ]}
      >
        {tab === 'menu' ? (
          <div className="flex flex-col gap-6 p-4 sm:p-5">
            <DynamicTableSection<UssdMenuNode>
              variant="embedded"
              headers={MENU_HEADERS}
              data={MOCK_OPERATOR_MENU}
              getRowKey={(item) => `op-${item.key}`}
              showRowAction={false}
              toolbar={{
                title: 'Operator menu',
                showFilter: false,
              }}
              renderItems={(node) => [
                <span key="k" className="font-mono text-xs text-[var(--mu)]">
                  {node.key}
                </span>,
                <span key="l" className="text-xs font-bold text-[var(--tx)]">
                  {node.label}
                </span>,
                <span key="h" className="text-xs text-[var(--mu)]">
                  {node.hint}
                </span>,
                <TableStatusBadge key="st" label="Valid" tone="success" />,
              ]}
            />
            <p className="-mt-3 text-[12px] text-[var(--mu)]">
              Menu text is published in KURA, not edited live. Length-checked against the channel
              limit. Open sessions keep the prior version until they end.
            </p>

            <DynamicTableSection<UssdMenuNode>
              variant="embedded"
              headers={MENU_HEADERS}
              data={MOCK_AGENT_MENU}
              getRowKey={(item) => `ag-${item.key}`}
              showRowAction={false}
              toolbar={{
                title: 'Agent menu',
                showFilter: false,
              }}
              renderItems={(node) => [
                <span key="k" className="font-mono text-xs text-[var(--mu)]">
                  {node.key}
                </span>,
                <span key="l" className="text-xs font-bold text-[var(--tx)]">
                  {node.label}
                </span>,
                <span key="h" className="text-xs text-[var(--mu)]">
                  {node.hint}
                </span>,
                <TableStatusBadge key="st" label="Valid" tone="success" />,
              ]}
            />
            <p className="-mt-3 text-[12px] text-[var(--mu)]">
              Cash deposit, plan payment, check operator — PRD agent USSD. Shortcode provisioning and
              MNO approval sit on Africa’s Talking’s dashboard; Admin does not push menus to AT.
            </p>
          </div>
        ) : null}

        {tab === 'templates' ? (
          <DynamicTableSection<UssdTemplateRecord>
            variant="embedded"
            headers={TEMPLATE_HEADERS}
            data={pageRows}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'SMS templates',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search templates…',
              onFilter: controls.openFilter,
              showFilter: true,
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/ussd/new')}
                >
                  Add New Template
                </Button>
              ),
            }}
            onRowClick={(item) => navigate(`/ussd/${item.id}`)}
            renderItems={(item) => [
              <span key="name" className="text-xs font-bold text-[var(--tx)]">
                {item.name}
              </span>,
              <span key="tr" className="text-xs text-[var(--mu)]">
                {item.trigger}
              </span>,
              <span key="prev" className="max-w-[280px] truncate text-xs text-[var(--mu)]">
                {item.body}
              </span>,
              <span key="len" className="font-mono text-xs text-[var(--tx)]">
                {item.body.length}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status === 'ACTIVE' ? 'Active' : 'Draft'}
                tone={item.status === 'ACTIVE' ? 'success' : 'warning'}
              />,
            ]}
          />
        ) : null}

        {tab === 'languages' ? (
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <DynamicTableSection<(typeof LANGUAGES)[number]>
              variant="embedded"
              headers={LANG_HEADERS}
              data={LANGUAGES}
              getRowKey={(row) => row.code}
              showRowAction={false}
              toolbar={{
                title: 'Language packs',
                showFilter: false,
              }}
              renderItems={(lang) => [
                <span key="n" className="text-xs font-bold text-[var(--tx)]">
                  {lang.name}
                </span>,
                <span key="c" className="font-mono text-xs text-[var(--tx)]">
                  {lang.code}
                </span>,
                <span key="r" className="text-xs text-[var(--mu)]">
                  {lang.role}
                </span>,
                <TableStatusBadge
                  key="st"
                  label={lang.status === 'ACTIVE' ? 'Active' : 'Post-MVP'}
                  tone={lang.status === 'ACTIVE' ? 'success' : 'warning'}
                />,
              ]}
            />
            <p className="text-[12.5px] leading-relaxed text-[var(--mu)]">
              MVP ships English only. Extra languages are post-MVP KURA string packs (menu + SMS
              copy in our config) — not something you create by calling Africa’s Talking. There is
              no “Add New Language” against the gateway; when multi-language ships, Admin will
              publish translated ConfigVersions and the backend will serve them on USSD callbacks /
              SMS send.
            </p>
          </div>
        ) : null}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
