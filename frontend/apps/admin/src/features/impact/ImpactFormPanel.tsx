import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, TextInput, Textarea, Title, Text } from '@mantine/core'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useCreateImpactStory,
  useImpactStory,
  useUpdateImpactStory,
} from './hooks/use-impact'
import type { ImpactStoryStatus } from './types'

const TIPS = [
  'Stories are partner-facing briefs — keep the highlight measurable.',
  'List government partners with · between names (e.g. LAMATA · LASTMA).',
  'Drafts stay internal until you Publish from the story detail.',
]

export function ImpactFormPanel({ storyId }: { storyId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { story } = useImpactStory(storyId, {
    enabled: Boolean(storyId) && can('impact:manage'),
  })
  const create = useCreateImpactStory()
  const update = useUpdateImpactStory(storyId ?? '')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [metricHighlight, setMetricHighlight] = useState('')
  const [partners, setPartners] = useState('')
  const [status, setStatus] = useState<ImpactStoryStatus>('DRAFT')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!story) return
    setTitle(story.title)
    setRegion(story.region)
    setMetricHighlight(story.metric_highlight)
    setPartners(story.partners)
    setStatus(story.status)
    setSummary(story.summary)
  }, [story])

  if (!can('impact:manage')) {
    return (
      <SidebarFormLayout
        sidebarTitle="Impact story"
        sidebarTips={TIPS}
        onClose={() => navigate('/impact')}
      >
        <Text size="sm">You need impact:manage to edit stories.</Text>
      </SidebarFormLayout>
    )
  }

  const isEdit = Boolean(storyId)
  const leave = () =>
    navigate(isEdit && storyId ? `/impact/${storyId}` : '/impact')
  const busy = create.isPending || update.isPending

  const save = async () => {
    setError(null)
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    const payload = {
      title: title.trim(),
      region,
      metric_highlight: metricHighlight,
      partners,
      summary,
      status,
    }
    try {
      if (isEdit && storyId) {
        await update.mutateAsync(payload)
        setSavedId(storyId)
      } else {
        const row = await create.mutateAsync(payload)
        setSavedId(row.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    }
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={isEdit ? 'Edit impact story' : 'Add impact story'}
        sidebarSubtitle="Impact · Stories"
        sidebarTips={TIPS}
        steps={[{ label: 'Brief' }]}
        activeStep={0}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={leave}
            submitLabel={isEdit ? 'Save story' : 'Save draft'}
            loading={busy}
            submitType="button"
            onSubmitClick={() => {
              save().catch(() => undefined)
            }}
          />
        }
      >
        {error ? (
          <Text size="sm" c="red" mb="sm">
            {error}
          </Text>
        ) : null}
        <Title order={5}>Story brief</Title>
        <TextInput
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <TextInput
          label="Region"
          value={region}
          onChange={(e) => setRegion(e.currentTarget.value)}
        />
        <TextInput
          label="Metric highlight"
          value={metricHighlight}
          onChange={(e) => setMetricHighlight(e.currentTarget.value)}
        />
        <TextInput
          label="Partners"
          description="Separate with ·"
          value={partners}
          onChange={(e) => setPartners(e.currentTarget.value)}
        />
        <Select
          label="Status"
          data={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          value={status}
          onChange={(v) => setStatus((v as ImpactStoryStatus) ?? 'DRAFT')}
        />
        <Textarea
          label="Summary"
          minRows={3}
          value={summary}
          onChange={(e) => setSummary(e.currentTarget.value)}
        />
      </SidebarFormLayout>
      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        onClose={leave}
        mode={isEdit ? 'saved' : 'created'}
        title={isEdit ? 'Story saved' : 'Draft created'}
        description="Publish from the detail page when ready."
        actionLabel="Open story"
        onAction={() => navigate(`/impact/${savedId}`)}
      />
    </>
  )
}
