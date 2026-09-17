import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Select, Skeleton, useMantineColorScheme } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  IllustratedFormModal,
  KuraIllustrationModal,
  type AdminDetailAction,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { useStaffUsers } from '@features/users'
import {
  useAssignCase,
  useAddCaseNote,
  useSetCaseStatus,
  useSupportCase,
} from '@features/support'
import { useCapabilities } from '../auth/useCapabilities'
import { CaseNoteComposeModal } from './CaseNoteComposeModal'
import { CaseDetailBody } from './CaseDetailBody'
import { CaseStatusTracker } from './CaseStatusTracker'
import { formatCaseWhen, noteBodyText } from './caseDetailHelpers'

export function CasesDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const { supportCase, isPending, isError, refetch } = useSupportCase(id)
  const assign = useAssignCase(id ?? '')
  const setStatus = useSetCaseStatus(id ?? '')
  const addNote = useAddCaseNote(id ?? '')
  const [assignOpen, setAssignOpen] = useState(false)
  const [draftAssignee, setDraftAssignee] = useState<string | null>(null)
  const [staffSearch, setStaffSearch] = useState('')
  const [pendingClose, setPendingClose] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  const { raw: staff } = useStaffUsers({
    search: staffSearch || undefined,
    page_size: 40,
    enabled: assignOpen && can('users:read'),
  })

  const staffOptions = useMemo(
    () =>
      staff.map((u) => ({
        value: u.id,
        label:
          u.name?.trim() ||
          `${u.first_name} ${u.last_name}`.trim() ||
          u.email ||
          u.phone ||
          u.id,
      })),
    [staff],
  )

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={320} radius="md" />
      </div>
    )
  }

  if (isError || !supportCase) {
    return (
      <AdminDetailPage
        backLabel="Back to cases"
        onBack={() => navigate('/cases')}
        title="Case not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const closed =
    supportCase.status === 'CLOSED' || supportCase.status === 'RESOLVED'
  const canManage = can('cases:manage')

  const actions: AdminDetailAction[] = []
  if (canManage) {
    actions.push({
      id: 'note',
      label: 'Add note',
      onClick: () => setNoteOpen(true),
    })
    actions.push({
      id: 'assign',
      label: 'Assign owner',
      onClick: () => {
        setDraftAssignee(supportCase.assigned_to_id)
        setAssignOpen(true)
      },
    })
    if (!closed) {
      actions.push({
        id: 'close',
        label: 'Close case',
        onClick: () => setPendingClose(true),
      })
    } else {
      actions.push({
        id: 'reopen',
        label: 'Reopen',
        onClick: async () => {
          await setStatus.mutateAsync({ status: 'OPEN', note: 'Reopened' })
          await refetch()
          setSuccess('Case reopened')
        },
      })
    }
  }

  return (
    <>
      <AdminDetailPage
        backLabel="Back to cases"
        onBack={() => navigate('/cases')}
        breadcrumbs={[
          { label: 'Support Cases', to: '/cases' },
          { label: supportCase.code },
        ]}
        title={supportCase.code}
        subtitle={`${supportCase.priority} · ${supportCase.kind} · ${supportCase.subject}`}
        statusLabel={supportCase.status.replace(/_/g, ' ')}
        statusTone={closed ? 'success' : 'warning'}
        actions={actions}
        showActivity
        activityTitle="Tracker"
        activitySlot={
          <CaseStatusTracker
            status={supportCase.status}
            assigneeName={supportCase.assigned_to_name}
          />
        }
        notesTitle="Conversation"
        notes={supportCase.events
          .filter((e) => e.kind === 'NOTE' || e.kind === 'ATTACHMENT')
          .map((e) => {
            const text = noteBodyText(e.body, e.attachment_url)
            return {
              id: e.id,
              body:
                text ||
                (e.attachment_url
                  ? e.attachment_name || 'Photo attached'
                  : '—'),
              author: e.actor_name ?? 'Staff',
              at: formatCaseWhen(e.created_at),
              attachmentUrl: e.attachment_url,
              attachmentName: e.attachment_name,
              attachmentContentType: e.attachment_content_type,
            }
          })}
        showNotes
      >
        <CaseDetailBody supportCase={supportCase} />
      </AdminDetailPage>

      <CaseNoteComposeModal
        opened={noteOpen}
        onClose={() => setNoteOpen(false)}
        busy={addNote.isPending}
        onSubmit={async (input) => {
          await addNote.mutateAsync(input)
          await refetch()
          setSuccess('Note added')
        }}
      />

      <IllustratedFormModal
        opened={assignOpen}
        onClose={() => setAssignOpen(false)}
        illustration={illustrationSrc('assigned-agent', themeKey)}
        title="Assign owner"
        description="Select the staff user responsible for this case."
      >
        <Select
          label="Staff"
          placeholder="Search staff…"
          data={staffOptions}
          searchable
          clearable
          searchValue={staffSearch}
          onSearchChange={setStaffSearch}
          value={draftAssignee}
          onChange={setDraftAssignee}
        />
        <Button
          mt="md"
          fullWidth
          className="bg-[var(--pr)] hover:opacity-90"
          loading={assign.isPending}
          disabled={assign.isPending}
          onClick={async () => {
            await assign.mutateAsync({ assigned_to_id: draftAssignee })
            setAssignOpen(false)
            await refetch()
            setSuccess('Assignee updated')
          }}
        >
          Save assignment
        </Button>
      </IllustratedFormModal>

      <AdminConfirmModal
        opened={pendingClose}
        onClose={() => setPendingClose(false)}
        title="Close this case?"
        body="Marks the case resolved/closed in the support queue."
        confirmLabel="Close case"
        reasonRequired
        illustrationId="confirm-action"
        onConfirm={async (reason) => {
          setPendingClose(false)
          await setStatus.mutateAsync({
            status: 'CLOSED',
            note: reason || 'Closed',
          })
          await refetch()
          setSuccess('Case closed')
        }}
      />

      <KuraIllustrationModal
        opened={!!success}
        onClose={() => setSuccess(null)}
        illustrationId="success-check"
        title={success ?? undefined}
        description={`${supportCase.code} · ${supportCase.subject}`}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccess(null),
        }}
      />
    </>
  )
}
