import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberInput, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminDetailPage,
  FormFooterActions,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'
import {
  useCashDeposits,
  useCloseShift,
  useLodgeShift,
  useShift,
} from './hooks/use-cash-ops'
import {
  cashPhaseHint,
  cashStatusLabel,
  cashStatusTone,
  shiftCashPhase,
} from './cashReconHelpers'
import { CashShiftPhaseStrip } from './CashShiftPhaseStrip'

export function CashReconDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data: shift, isPending, isError, refetch } = useShift(id)
  const deposits = useCashDeposits({ shift: id, enabled: Boolean(id) })
  const closeMut = useCloseShift(id)
  const lodgeMut = useLodgeShift(id)
  const [closing, setClosing] = useState<number | string>('')
  const [lodgeRef, setLodgeRef] = useState('')
  const [lodgeAmount, setLodgeAmount] = useState<number | string>('')

  if (isPending) {
    return (
      <AdminDetailPage
        backLabel="Back to payments"
        onBack={() => navigate('/payments?tab=cash')}
        title="Loading shift…"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  if (isError || !shift) {
    return (
      <AdminDetailPage
        backLabel="Back to payments"
        onBack={() => navigate('/payments?tab=cash')}
        title="Shift not found"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  const phase = shiftCashPhase(shift)
  const variance = shift.variance_kobo ?? 0
  const takes = deposits.data?.results ?? []

  const onClose = async () => {
    const kobo = Math.round(Number(closing) * 100)
    if (!Number.isFinite(kobo) || kobo < 0) {
      notifications.show({
        color: 'red',
        message: 'Enter how much cash is in the drawer (₦).',
      })
      return
    }
    try {
      await closeMut.mutateAsync({ closing_cash_kobo: kobo })
      await refetch()
      notifications.show({ color: 'green', message: 'Drawer counted · shift closed.' })
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not close shift'),
      })
    }
  }

  const onLodge = async () => {
    const ref = lodgeRef.trim()
    if (!ref) {
      notifications.show({
        color: 'red',
        message: 'Enter the bank slip or PSP lodge reference.',
      })
      return
    }
    const amountNaira = lodgeAmount === '' ? undefined : Number(lodgeAmount)
    const amount_kobo =
      amountNaira == null || !Number.isFinite(amountNaira)
        ? undefined
        : Math.round(amountNaira * 100)
    try {
      await lodgeMut.mutateAsync({
        lodge_ref: ref,
        ...(amount_kobo != null ? { amount_kobo } : {}),
      })
      await refetch()
      notifications.show({ color: 'green', message: 'Bank lodge confirmed.' })
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not confirm lodge'),
      })
    }
  }

  return (
    <AdminDetailPage
      backLabel="Back to cash"
      onBack={() => navigate('/payments?tab=cash')}
      title={shift.agent_name}
      subtitle={`${shift.hub_name || shift.hub_code} · cash shift`}
      statusLabel={cashStatusLabel(phase)}
      statusTone={cashStatusTone(phase)}
      summaryRows={[
        { label: 'Opened', value: new Date(shift.opened_at).toLocaleString() },
        {
          label: 'Opening float',
          value: formatNaira(shift.opening_cash_kobo, { fromKobo: true }),
        },
        {
          label: 'Expected in drawer',
          value:
            shift.expected_cash_kobo != null
              ? formatNaira(shift.expected_cash_kobo, { fromKobo: true })
              : 'After count',
        },
        {
          label: 'Counted',
          value:
            shift.closing_cash_kobo != null
              ? formatNaira(shift.closing_cash_kobo, { fromKobo: true })
              : '—',
        },
        {
          label: 'Variance',
          value:
            shift.variance_kobo != null
              ? formatNaira(shift.variance_kobo, { fromKobo: true })
              : '—',
        },
        {
          label: 'Bank lodge',
          value: shift.lodged_at
            ? `${shift.lodge_ref || '—'} · ${formatNaira(shift.lodged_amount_kobo ?? 0, { fromKobo: true })}`
            : 'Not lodged',
        },
      ]}
    >
      <CashShiftPhaseStrip phase={phase} />
      <p className="mb-4 mt-3 text-[13px] leading-relaxed text-[var(--mu)]">
        {cashPhaseHint(phase)}
      </p>

      {Math.abs(variance) >= 10_000 ? (
        <p className="mb-3 rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-[var(--tx)]">
          Variance is large enough to open an alert. Check{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => navigate('/alerts')}
          >
            Alerts
          </button>{' '}
          if you need a follow-up.
        </p>
      ) : null}

      <h3 className="mb-2 text-[14px] font-bold text-[var(--tx)]">
        Cash taken this shift
      </h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {takes.map((d) => (
          <li
            key={d.id}
            className="rounded-[10px] border border-[var(--bd)] px-3 py-2 text-[13px]"
          >
            <span className="font-semibold">{d.receipt_code}</span>
            {' · '}
            {formatNaira(d.amount_kobo, { fromKobo: true })}
            {' · '}
            {d.account_kura_id || 'rider'}
            {' · '}
            {d.status === 'SUCCESS' ? 'Recorded' : d.status}
          </li>
        ))}
        {!deposits.isPending && takes.length === 0 ? (
          <li className="text-[13px] text-[var(--mu)]">
            No cash payments recorded on this shift yet.
          </li>
        ) : null}
      </ul>

      {shift.status === 'OPEN' ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--bd)] pt-4 sm:flex-row sm:items-end">
          <NumberInput
            label="Cash in drawer now (₦)"
            description="Count physical notes and coins"
            value={closing}
            onChange={setClosing}
            min={0}
            decimalScale={2}
            className="sm:w-56"
          />
          <FormFooterActions
            onBack={() => navigate('/payments?tab=cash')}
            submitLabel="Close shift"
            submitType="button"
            disabled={closeMut.isPending}
            onSubmitClick={onClose}
          />
        </div>
      ) : !shift.lodged_at ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--bd)] pt-4 sm:flex-row sm:items-end">
          <TextInput
            label="Bank / PSP slip reference"
            value={lodgeRef}
            onChange={(e) => setLodgeRef(e.currentTarget.value)}
            className="sm:w-64"
          />
          <NumberInput
            label="Amount lodged (₦)"
            description="Optional · defaults to expected total"
            value={lodgeAmount}
            onChange={setLodgeAmount}
            min={0}
            decimalScale={2}
            className="sm:w-48"
          />
          <FormFooterActions
            onBack={() => navigate('/payments?tab=cash')}
            submitLabel="Confirm lodge"
            submitType="button"
            disabled={lodgeMut.isPending}
            onSubmitClick={onLodge}
          />
        </div>
      ) : null}
    </AdminDetailPage>
  )
}

export { cashStatusLabel, cashStatusTone } from './cashReconHelpers'
