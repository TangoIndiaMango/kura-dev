import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberInput, Select, TextInput, Title, Text, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  FormPageLoadingSkeleton,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useCreateSegment,
  usePreviewSegment,
  useSegment,
  useUpdateSegment,
} from './hooks/use-segments'
import {
  SEGMENT_CREATE_TIPS,
  SEGMENT_EDIT_TIPS,
  SEGMENT_KIND_OPTS,
  SEGMENT_KYC_OPTS,
  SEGMENT_STATUS_OPTS,
} from './segmentFormOptions'
import { SegmentMembersTable } from './SegmentMembersTable'
import type { SegmentCriteria, SegmentMemberApi, SegmentStatus } from './types'

export function SegmentFormPanel({ segmentId }: { segmentId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(segmentId)
  const { segment, isPending } = useSegment(segmentId, { enabled: isEdit })
  const create = useCreateSegment()
  const update = useUpdateSegment(segmentId ?? '')
  const preview = usePreviewSegment()

  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<SegmentStatus>('DRAFT')
  const [acctStatus, setAcctStatus] = useState<string | null>('ACTIVE')
  const [kyc, setKyc] = useState<string | null>('VERIFIED')
  const [kind, setKind] = useState<string | null>(null)
  const [minDays, setMinDays] = useState<number | string>('')
  const [maxDays, setMaxDays] = useState<number | string>('')
  const [minScore, setMinScore] = useState<number | string>('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewSample, setPreviewSample] = useState<SegmentMemberApi[]>([])

  useEffect(() => {
    if (!segment) return
    setName(segment.name)
    setStatus((segment.status as SegmentStatus) || 'DRAFT')
    const c = segment.criteria ?? {}
    setAcctStatus(typeof c.status === 'string' ? c.status : null)
    setKyc(typeof c.kyc_status === 'string' ? c.kyc_status : null)
    setKind(typeof c.kind === 'string' ? c.kind : null)
    setMinDays(c.min_active_days ?? '')
    setMaxDays(c.max_active_days ?? '')
    setMinScore(c.min_score ?? '')
    setPreviewCount(segment.last_count)
  }, [segment])

  if (isEdit && isPending) return <FormPageLoadingSkeleton />

  const leave = () =>
    navigate(isEdit && segmentId ? `/segments/${segmentId}` : '/segments')

  const buildCriteria = (): SegmentCriteria => {
    const criteria: SegmentCriteria = {}
    if (acctStatus) criteria.status = acctStatus
    if (kyc) criteria.kyc_status = kyc
    if (kind) criteria.kind = kind
    const min = Number(minDays)
    const max = Number(maxDays)
    if (Number.isFinite(min) && min > 0) criteria.min_active_days = Math.floor(min)
    if (Number.isFinite(max) && max > 0) criteria.max_active_days = Math.floor(max)
    const score = Number(minScore)
    if (Number.isFinite(score) && score > 0) criteria.min_score = Math.floor(score)
    return criteria
  }

  const runPreview = () => {
    const criteria = buildCriteria()
    if (Object.keys(criteria).length === 0) {
      notifications.show({
        color: 'red',
        message: 'Pick at least one criterion before preview.',
      })
      return
    }
    preview.mutate(
      { criteria },
      {
        onSuccess: (data) => {
          setPreviewCount(data.count)
          setPreviewSample(data.sample ?? [])
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'Preview failed'),
          }),
      },
    )
  }

  const persist = () => {
    const criteria = buildCriteria()
    if (!name.trim()) {
      notifications.show({ color: 'red', message: 'Name is required.' })
      return
    }
    if (Object.keys(criteria).length === 0) {
      notifications.show({
        color: 'red',
        message: 'Add at least one membership criterion.',
      })
      return
    }
    const onOk = (row: { id: string }) => {
      setSavedId(row.id)
      setSaved(true)
    }
    const onFail = (err: unknown) =>
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, isEdit ? 'Save failed' : 'Create failed'),
      })
    if (isEdit && segmentId) {
      update.mutate(
        { name: name.trim(), criteria, status },
        { onSuccess: onOk, onError: onFail },
      )
      return
    }
    create.mutate(
      { name: name.trim(), criteria, status },
      { onSuccess: onOk, onError: onFail },
    )
  }

  const title = isEdit ? 'Edit segment' : 'Create segment'
  const busy = create.isPending || update.isPending

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={title}
        sidebarSubtitle="Commercial · Segments"
        sidebarTips={isEdit ? SEGMENT_EDIT_TIPS : SEGMENT_CREATE_TIPS}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={leave}
            submitLabel={isEdit ? 'Save changes' : 'Save Segment'}
            submitType="button"
            disabled={busy}
            onSubmitClick={persist}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {isEdit ? 'Segment details' : 'New segment'}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Name the cohort and set who belongs in it.
          </Text>
        </div>

        <TextInput
          label="Segment name"
          placeholder="e.g. High-tenure verified riders"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Select
          label="Segment status"
          value={status}
          onChange={(v) => setStatus((v as SegmentStatus) ?? 'DRAFT')}
          data={[
            { value: 'DRAFT', label: 'Draft — not used for targeting' },
            { value: 'ACTIVE', label: 'Active — available for offers' },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Account status"
            clearable
            data={SEGMENT_STATUS_OPTS}
            value={acctStatus}
            onChange={setAcctStatus}
          />
          <Select
            label="KYC status"
            clearable
            data={SEGMENT_KYC_OPTS}
            value={kyc}
            onChange={setKyc}
          />
          <Select
            label="Account kind"
            clearable
            data={SEGMENT_KIND_OPTS}
            value={kind}
            onChange={setKind}
          />
          <NumberInput
            label="Min tenure (days)"
            min={0}
            value={minDays}
            onChange={setMinDays}
          />
          <NumberInput
            label="Max tenure (days)"
            min={0}
            value={maxDays}
            onChange={setMaxDays}
          />
          <NumberInput
            label="Min credit score"
            description="Latest live score · leave blank to ignore"
            min={0}
            max={100}
            value={minScore}
            onChange={setMinScore}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="light"
            color="brand"
            loading={preview.isPending}
            onClick={runPreview}
          >
            Preview coverage
          </Button>
          {previewCount != null ? (
            <Text size="sm" fw={600} className="text-[var(--tx)]">
              {previewCount.toLocaleString()} operators match
            </Text>
          ) : null}
        </div>
        {previewSample.length > 0 ? (
          <SegmentMembersTable members={previewSample} />
        ) : null}
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          if (savedId) navigate(`/segments/${savedId}`)
          else leave()
        }}
        title={isEdit ? 'Segment updated' : 'Segment created'}
        description="Cohort is saved. Activate it before wiring to Product Offers."
        actionLabel="View segment"
        onAction={() => {
          setSaved(false)
          if (savedId) navigate(`/segments/${savedId}`)
          else leave()
        }}
      />
    </>
  )
}
