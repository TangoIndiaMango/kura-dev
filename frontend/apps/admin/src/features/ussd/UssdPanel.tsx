import { useState } from 'react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { useSmsTemplatesConfig, useUssdConfig } from './useUssdConfig'
import { UssdMenuTab } from './UssdMenuTab'
import { UssdTemplatesTab } from './UssdTemplatesTab'

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

const LANGUAGES = [
  { code: 'en', name: 'English', role: 'Primary · MVP', status: 'ACTIVE' as const },
  { code: 'pcm', name: 'Pidgin', role: 'Roadmap · post-MVP', status: 'POST_MVP' as const },
  { code: 'yo', name: 'Yoruba', role: 'Roadmap · post-MVP', status: 'POST_MVP' as const },
  { code: 'ha', name: 'Hausa', role: 'Roadmap · post-MVP', status: 'POST_MVP' as const },
]

export function UssdPanel() {
  const [tab, setTab] = useState('menu')
  const controls = useAdminModuleControls({
    scope: 'ussd',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter templates',
  })
  const ussd = useUssdConfig(tab === 'menu' || tab === 'languages')
  const sms = useSmsTemplatesConfig(tab === 'templates')
  const shortcode = ussd.data?.effective.shortcode || '*347*88#'
  const templateCount = sms.data?.effective.templates?.length ?? 0

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
            value: shortcode,
            sub: ussd.data?.effective.enabled ? 'Config enabled' : 'Config off',
          },
          {
            title: 'MVP language',
            value: (ussd.data?.effective.primary_language || 'en').toUpperCase(),
            sub: 'Pidgin / Yoruba / Hausa post-MVP',
            tone: 'warning',
          },
          {
            title: 'SMS templates',
            value: String(templateCount),
            sub: 'Live config namespace',
          },
        ]}
      >
        {tab === 'menu' ? <UssdMenuTab /> : null}
        {tab === 'templates' ? (
          <UssdTemplatesTab
            search={controls.search}
            matchesStatus={controls.matchesStatus}
            onFilter={controls.openFilter}
            searchQuery={controls.searchQuery}
            setSearchQuery={controls.setSearchQuery}
            paginate={controls.paginate}
          />
        ) : null}
        {tab === 'languages' ? (
          <DynamicTableSection<(typeof LANGUAGES)[number]>
            variant="embedded"
            headers={LANG_HEADERS}
            data={LANGUAGES}
            getRowKey={(row) => row.code}
            showRowAction={false}
            toolbar={{ title: 'Language packs', showFilter: false }}
            renderItems={(row) => [
              <span key="n" className="text-xs font-bold text-[var(--tx)]">
                {row.name}
              </span>,
              <span key="c" className="font-mono text-xs text-[var(--mu)]">
                {row.code}
              </span>,
              <span key="r" className="text-xs text-[var(--mu)]">
                {row.role}
              </span>,
              <TableStatusBadge
                key="st"
                label={row.status === 'ACTIVE' ? 'Active' : 'Post-MVP'}
                tone={row.status === 'ACTIVE' ? 'success' : 'default'}
              />,
            ]}
          />
        ) : null}
      </AdminModuleLayout>
      {tab === 'templates' ? controls.filterModal : null}
    </>
  )
}
