import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Checkbox, TextInput, Textarea, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminFormSuccessModal,
  DetailPageLoadingSkeleton,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useCreateRole,
  usePermissions,
  useRole,
  useUpdateRole,
} from './hooks/use-users'

const ROLE_TIPS = [
  'Prefer least privilege for field and partner roles.',
  'System roles cannot be deleted after creation.',
  'Permissions apply on the user’s next session refresh.',
  'Changes are logged to the audit trail.',
]

const ROLE_STEPS = [{ label: 'Role Details' }, { label: 'Permissions' }]

interface RoleFormPanelProps {
  roleCode?: string
  duplicateFrom?: string | null
}

function groupByModule<T extends { module: string }>(items: T[]) {
  const map = new Map<string, T[]>()
  for (const p of items) {
    const list = map.get(p.module) ?? []
    list.push(p)
    map.set(p.module, list)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function RoleFormPanel({ roleCode, duplicateFrom }: RoleFormPanelProps) {
  const navigate = useNavigate()
  const editId =
    roleCode && /^[0-9a-f-]{36}$/i.test(roleCode) ? roleCode : undefined
  const dupId =
    duplicateFrom && /^[0-9a-f-]{36}$/i.test(duplicateFrom)
      ? duplicateFrom
      : undefined

  const editQuery = useRole(editId)
  const dupQuery = useRole(dupId)
  const source = editQuery.raw ?? dupQuery.raw ?? null
  const { data: permsPage, isPending: permsPending } = usePermissions()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole(source?.id || editId || '')

  const isEdit = Boolean(editId && editQuery.raw)
  const isDuplicate = Boolean(dupId && dupQuery.raw && !isEdit)
  const loadingSource =
    (Boolean(editId) && editQuery.isPending) ||
    (Boolean(dupId) && dupQuery.isPending)

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!source) return
    setName(isDuplicate ? `${source.name} (copy)` : source.name)
    setCode(isDuplicate ? `${source.code}_COPY` : source.code)
    setDescription(source.description || '')
    setSelectedIds((source.permissions ?? []).map((p) => p.id))
  }, [source?.id, isDuplicate])

  const permissions = permsPage?.results ?? []
  const byModule = groupByModule(permissions)
  const saving = createRole.isPending || updateRole.isPending
  const stepValid =
    step === 0 ? name.trim().length > 0 && code.trim().length > 0 : true
  const sidebarTitle = isEdit
    ? 'Edit Role'
    : isDuplicate
      ? 'Duplicate Role'
      : 'Add New Role'

  const close = () =>
    navigate(isEdit && source ? `/users/roles/${source.id}` : '/users?tab=roles')

  const handleSave = async () => {
    try {
      if (isEdit && source) {
        await updateRole.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedIds,
        })
      } else {
        await createRole.mutateAsync({
          code: code.trim().toUpperCase().replace(/\s+/g, '_'),
          name: name.trim(),
          description: description.trim(),
          permission_ids: selectedIds,
        })
      }
      setSaved(true)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save role'),
      })
    }
  }

  if (loadingSource) return <DetailPageLoadingSkeleton />

  return (
    <>
      <SidebarFormLayout
        contentWidth={1100}
        sidebarTitle={sidebarTitle}
        sidebarSubtitle="Access control"
        sidebarTips={ROLE_TIPS}
        steps={ROLE_STEPS}
        activeStep={step}
        onStepChange={setStep}
        onClose={close}
        footer={
          <FormFooterActions
            onBack={() => {
              if (step === 0) close()
              else setStep(0)
            }}
            submitLabel={step === 0 ? 'Continue' : isEdit ? 'Save changes' : 'Submit'}
            submitType="button"
            disabled={!stepValid || saving}
            onSubmitClick={step === 0 ? () => setStep(1) : handleSave}
          />
        }
      >
        <Title order={3} className="text-[var(--tx)]">
          {step === 0 ? 'Role Details' : 'Permissions'}
        </Title>
        <p className="text-[13px] leading-relaxed text-[var(--mu)]">
          {step === 0
            ? 'Fill in the role details below. Required fields are marked with an asterisk.'
            : 'Grant capabilities from the live permission catalog.'}
        </p>

        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <TextInput
              label="Role Name"
              placeholder="e.g. Regional Field Auditor"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextInput
              label="Role Code"
              placeholder="e.g. FIELD_AUDITOR"
              required
              disabled={isEdit && source?.is_system}
              value={code}
              onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
            />
            <Textarea
              label="Role Description"
              placeholder="What this role is for"
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {permsPending ? (
              <p className="text-sm text-[var(--mu)]">Loading permissions…</p>
            ) : null}
            {byModule.map(([module, perms]) => (
              <div
                key={module}
                className="rounded-[12px] border border-[var(--bd)] px-3 py-3"
              >
                <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--mu)]">
                  {module}
                </p>
                <div className="flex flex-col gap-2">
                  {perms.map((p) => (
                    <Checkbox
                      key={p.id}
                      label={`${p.name} (${p.code})`}
                      checked={selectedIds.includes(p.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(p.id)
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id],
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            {!permsPending && permissions.length === 0 ? (
              <p className="text-sm text-[var(--mu)]">
                No permissions loaded. Run seed_roles on the API.
              </p>
            ) : null}
          </div>
        )}
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          close()
        }}
        title={isEdit ? 'Role updated' : isDuplicate ? 'Role duplicated' : 'Role created'}
        description={
          isEdit
            ? 'Permission changes apply on each user’s next session refresh.'
            : 'The role is ready to assign. Staff permissions update on their next session.'
        }
        actionLabel={isEdit ? 'View role' : 'View roles'}
      />
    </>
  )
}
