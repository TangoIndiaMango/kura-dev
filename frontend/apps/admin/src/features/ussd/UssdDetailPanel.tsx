import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Textarea, TextInput, Title } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  AdminFormSuccessModal,
  FormFooterActions,
  KuraIllustrationModal,
  SidebarFormLayout,
  type AdminDetailAction,
  type KuraIllustrationId,
} from '@shared/components'
import { MOCK_TEMPLATES, type UssdTemplateRecord } from '@shared/mock/adminMockData'

type ActionId = 'test' | 'publish'

const ACTION_META: Record<
  ActionId,
  { confirmTitle: string; confirmBody: string; illustrationId: KuraIllustrationId }
> = {
  test: {
    confirmTitle: 'Send a test message?',
    confirmBody: 'Delivers a sample to the ops QA number. Gateway: Africa’s Talking.',
    illustrationId: 'success',
  },
  publish: {
    confirmTitle: 'Publish this template?',
    confirmBody: 'Draft → published. Messages already queued keep the prior version.',
    illustrationId: 'offer-published',
  },
}

/** Hifi SMS template detail — trigger, variables, length, edit / test / publish. */
export function UssdDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const found = useMemo(() => MOCK_TEMPLATES.find((t) => t.id === id) ?? null, [id])
  const [record, setRecord] = useState<UssdTemplateRecord | null>(found)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(found?.name ?? '')
  const [editTrigger, setEditTrigger] = useState(found?.trigger ?? '')
  const [editSaved, setEditSaved] = useState(false)
  const [pending, setPending] = useState<ActionId | null>(null)
  const [success, setSuccess] = useState<ActionId | null>(null)

  useEffect(() => {
    setRecord(found)
    setEditing(false)
    setEditName(found?.name ?? '')
    setEditTrigger(found?.trigger ?? '')
  }, [found])

  if (!found || !record) {
    return (
      <AdminDetailPage
        backLabel="Back to USSD"
        onBack={() => navigate('/ussd')}
        title="Template not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  if (editing) {
    return (
      <>
        <SidebarFormLayout
          sidebarTitle="Edit template"
          sidebarTips={[
            'Only supported variables may be used.',
            'Keep within one SMS segment when possible.',
            'Draft templates are not sent to operators.',
          ]}
          steps={[{ label: 'Details' }]}
          activeStep={0}
          onClose={() => setEditing(false)}
          footer={
            <FormFooterActions
              onBack={() => setEditing(false)}
              submitLabel="Save draft"
              submitType="button"
              onSubmitClick={() => {
                setRecord({
                  ...record,
                  name: editName.trim() || record.name,
                  trigger: editTrigger.trim() || record.trigger,
                  status: 'DRAFT',
                  updatedAt: 'Just now',
                })
                setEditSaved(true)
              }}
            />
          }
        >
          <Title order={3} className="text-[var(--tx)]">
            {editName || record.name}
          </Title>
          <TextInput
            label="Template name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
          />
          <TextInput
            label="Trigger event"
            value={editTrigger}
            onChange={(e) => setEditTrigger(e.currentTarget.value)}
          />
          <TextInput label="Language" defaultValue={record.language} />
          <Textarea
            label="Message"
            defaultValue={record.body}
            minRows={4}
            onChange={(e) => setRecord({ ...record, body: e.currentTarget.value })}
          />
        </SidebarFormLayout>

        <AdminFormSuccessModal
          opened={editSaved}
          onClose={() => {
            setEditSaved(false)
            setEditing(false)
          }}
          mode="saved"
          title="Draft saved"
          description={`${editName.trim() || record.name} is updated. Publish when ready.`}
          actionLabel="Done"
        />
      </>
    )
  }

  const meta = pending ? ACTION_META[pending] : null
  const placeholders = Array.from(record.body.matchAll(/\{(\w+)\}/g)).map((m) => m[1])

  const actions: AdminDetailAction[] = [
    { id: 'test', label: 'Send test', onClick: () => setPending('test') },
    { id: 'edit', label: 'Edit draft', onClick: () => {
      setEditName(record.name)
      setEditTrigger(record.trigger)
      setEditing(true)
    }},
  ]
  if (record.status === 'DRAFT') {
    actions.push({ id: 'publish', label: 'Publish', onClick: () => setPending('publish') })
  }

  return (
    <>
      <AdminDetailPage
        backLabel="Back to USSD"
        onBack={() => navigate('/ussd')}
        title={record.name}
        subtitle={`${record.trigger} · Gateway Africa’s Talking`}
        statusLabel={record.status === 'ACTIVE' ? 'Published' : 'Draft'}
        statusTone={record.status === 'ACTIVE' ? 'success' : 'warning'}
        actions={actions}
        summaryRows={[
          { label: 'Trigger', value: record.trigger },
          { label: 'Channel', value: record.channel },
          { label: 'Language', value: record.language },
          { label: 'Length', value: `${record.body.length} chars` },
        ]}
        detailRows={[
          { label: 'Body', value: record.body },
          {
            label: 'Variables',
            value: placeholders.length ? placeholders.map((p) => `{${p}}`).join(' · ') : 'None',
          },
          { label: 'Sender ID', value: 'KURA' },
          { label: 'Template ID', value: record.id },
        ]}
        summaryTitle="Template"
        detailTitle="Copy"
      />

      <AdminConfirmModal
        opened={!!pending}
        onClose={() => setPending(null)}
        title={meta?.confirmTitle ?? ''}
        body={meta?.confirmBody ?? ''}
        confirmLabel={pending === 'test' ? 'Send' : 'Publish'}
        illustrationId="confirm-action"
        onConfirm={() => {
          const action = pending
          setPending(null)
          if (!action) return
          if (action === 'publish') setRecord({ ...record, status: 'ACTIVE' })
          setSuccess(action)
        }}
      />

      <KuraIllustrationModal
        opened={!!success}
        onClose={() => setSuccess(null)}
        illustrationId={success ? ACTION_META[success].illustrationId : 'success'}
        primaryAction={{ label: 'Done', onClick: () => setSuccess(null) }}
      />
    </>
  )
}
