import { useMemo, useState } from 'react'
import { Button, Select, Textarea, useMantineColorScheme } from '@mantine/core'
import { IllustratedFormModal } from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { useOperators } from '@features/operators'
import { useFlagRiskEvent } from '@features/risk'
import { useCapabilities } from '../auth/useCapabilities'

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

type Props = {
  opened: boolean
  onClose: () => void
  onFlagged?: () => void
  presetAccountId?: string | null
  lockAccount?: boolean
}

export function FlagRiskModal({
  opened,
  onClose,
  onFlagged,
  presetAccountId,
  lockAccount = false,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const { can } = useCapabilities()
  const flag = useFlagRiskEvent()
  const [accountId, setAccountId] = useState<string | null>(presetAccountId ?? null)
  const [severity, setSeverity] = useState<string | null>('MEDIUM')
  const [note, setNote] = useState('')
  const [opSearch, setOpSearch] = useState('')

  const { operators, isPending } = useOperators({
    search: opSearch || undefined,
    page_size: 40,
  })

  const operatorOptions = useMemo(
    () =>
      operators.map((o) => ({
        value: o.id,
        label: `${o.kuraId} · ${o.name}`,
      })),
    [operators],
  )

  if (!can('risk:review')) return null

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={onClose}
      illustration={illustrationSrc('alert-escalated', themeKey)}
      title="Flag risk event"
      description="Select the account this signal is about. Manual flags enter the risk queue for review."
    >
      <div className="flex w-full flex-col gap-3">
        <Select
          label="Account responsible"
          placeholder="Search operators…"
          data={operatorOptions}
          searchable
          searchValue={opSearch}
          onSearchChange={setOpSearch}
          value={accountId ?? presetAccountId ?? null}
          onChange={setAccountId}
          nothingFoundMessage={isPending ? 'Loading…' : 'No operators'}
          disabled={lockAccount && Boolean(presetAccountId)}
        />
        <Select
          label="Severity"
          data={SEVERITY_OPTIONS}
          value={severity}
          onChange={setSeverity}
        />
        <Textarea
          label="Note"
          minRows={3}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Button
          fullWidth
          className="mt-1 bg-[var(--pr)] hover:opacity-90"
          loading={flag.isPending}
          disabled={flag.isPending || !(accountId || presetAccountId)}
          onClick={async () => {
            const id = accountId || presetAccountId
            if (!id) return
            await flag.mutateAsync({
              account_id: id,
              severity: severity || 'MEDIUM',
              note: note.trim() || undefined,
            })
            setNote('')
            onFlagged?.()
            onClose()
          }}
        >
          Flag account
        </Button>
      </div>
    </IllustratedFormModal>
  )
}
