import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DynamicTableSection,
  KuraIllustrationModal,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useCapabilities } from '../auth/useCapabilities'
import {
  formatPublishedAt,
  impactStoryTone,
} from './impactHelpers'
import { useImpactStory, usePublishImpactStory } from './hooks/use-impact'

const PARTNER_HEADERS: TableHeader[] = [
  { key: 'name', label: 'PARTNER' },
  { key: 'role', label: 'ROLE' },
  { key: 'status', label: 'BRIEF STATUS' },
]

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[var(--tx)]">{value}</div>
    </div>
  )
}

function parsePartners(raw: string) {
  return raw
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((name, i) => ({
      id: `p-${i}`,
      name,
      role: i === 0 ? 'Lead agency' : 'Co-signatory',
    }))
}

export function ImpactDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { story, isPending, isError, refetch } = useImpactStory(id)
  const publish = usePublishImpactStory(id ?? '')
  const [pendingPublish, setPendingPublish] = useState(false)
  const [successPublish, setSuccessPublish] = useState(false)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={280} radius="md" />
      </div>
    )
  }

  if (isError || !story) {
    return (
      <AdminDetailPage
        backLabel="Back to impact"
        onBack={() => navigate('/impact')}
        breadcrumbs={[{ label: 'Impact', to: '/impact' }, { label: id ?? '—' }]}
        title="Story not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const partners = parsePartners(story.partners)
  const canManage = can('impact:manage')

  return (
    <>
      <AdminDetailPage
        backLabel="Back to impact"
        onBack={() => navigate('/impact')}
        breadcrumbs={[
          { label: 'Impact', to: '/impact' },
          { label: story.title },
        ]}
        title={story.title}
        subtitle={`${story.region || 'Network'} · ${story.metric_highlight || 'Impact brief'}`}
        statusLabel={story.status}
        statusTone={
          story.status === 'PUBLISHED'
            ? 'success'
            : story.status === 'DRAFT'
              ? 'warning'
              : 'default'
        }
        actions={[
          ...(canManage
            ? [
                {
                  id: 'edit',
                  label: 'Edit',
                  onClick: () => navigate(`/impact/${story.id}/edit`),
                },
              ]
            : []),
          ...(canManage && story.status !== 'PUBLISHED'
            ? [
                {
                  id: 'publish',
                  label: 'Publish',
                  disabled: publish.isPending,
                  onClick: () => setPendingPublish(true),
                },
              ]
            : []),
          {
            id: 'export',
            label: 'Export CSV',
            onClick: () =>
              downloadCsv(
                `${story.id}.csv`,
                ['title', 'region', 'highlight', 'partners', 'status', 'published'],
                [
                  [
                    story.title,
                    story.region,
                    story.metric_highlight,
                    story.partners,
                    story.status,
                    formatPublishedAt(story.published_at),
                  ],
                ],
              ),
          },
        ]}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="flex flex-col gap-5">
                <section>
                  <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
                    Brief
                  </Text>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Fact label="Region" value={story.region || '—'} />
                    <Fact
                      label="Highlight"
                      value={story.metric_highlight || '—'}
                    />
                    <Fact
                      label="Published"
                      value={formatPublishedAt(story.published_at)}
                    />
                    <Fact
                      label="Status"
                      value={
                        <TableStatusBadge
                          label={story.status}
                          tone={impactStoryTone(story.status)}
                        />
                      }
                    />
                  </div>
                  {story.summary ? (
                    <Text size="sm" mt="md" className="text-[var(--mu)]">
                      {story.summary}
                    </Text>
                  ) : null}
                </section>
                <DynamicTableSection
                  variant="embedded"
                  headers={PARTNER_HEADERS}
                  data={partners}
                  getRowKey={(p) => p.id}
                  toolbar={{ title: 'Partners' }}
                  renderItems={(p) => [
                    <span key="n" className="text-xs font-semibold text-[var(--tx)]">
                      {p.name}
                    </span>,
                    <span key="r" className="text-xs text-[var(--mu)]">
                      {p.role}
                    </span>,
                    <TableStatusBadge
                      key="s"
                      label={story.status}
                      tone={impactStoryTone(story.status)}
                    />,
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      <AdminConfirmModal
        opened={pendingPublish}
        onClose={() => setPendingPublish(false)}
        title="Publish this story?"
        body="Makes the brief visible on the Government Impact view. Audited."
        confirmLabel="Publish"
        loading={publish.isPending}
        illustrationId={'confirm-action' satisfies KuraIllustrationId}
        onConfirm={async () => {
          try {
            await publish.mutateAsync({})
            await refetch()
            setPendingPublish(false)
            setSuccessPublish(true)
          } catch {
            setPendingPublish(false)
          }
        }}
      />
      <KuraIllustrationModal
        opened={successPublish}
        onClose={() => setSuccessPublish(false)}
        illustrationId="record-saved"
        title="Story published"
        description={story.title}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccessPublish(false),
        }}
      />
    </>
  )
}
