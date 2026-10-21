/** Bay surface when SWAP_VELOCITY blocks start — wait, request exception, retry. */
import { useEffect, useMemo, useState } from 'react'
import { Button, Select, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import {
  HUB_VELOCITY_EXCEPTION_REASONS,
  reasonLabel,
} from './hubBayReasons'
import {
  useRequestVelocityException,
  useVelocityBayStatus,
  type VelocityBayStatus,
} from './hooks/use-bay-swap'

export type VelocityThrottleHit = {
  message: string
  reason?: string
  retryAfterSeconds: number
  riskEventId?: string
  vehicleId: string
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function reasonCopy(reason?: string | null): string {
  if (reason === 'MAX_SWAPS_PER_VEHICLE_DAY') {
    return 'This vehicle hit today’s swap cap. Ops can grant a one-swap exception after review.'
  }
  if (reason === 'MIN_MINUTES_BETWEEN_SWAPS') {
    return 'Minimum gap between swaps for this vehicle. Wait out the timer, or request an ops exception.'
  }
  return 'Swap velocity rule blocked this start. Wait, or ask ops for an exception.'
}

type Props = {
  hit: VelocityThrottleHit
  hubId?: string
  accountId?: string
  retrying?: boolean
  onRetry: () => void
  onDismiss: () => void
}

export function HubBayVelocityGate({
  hit,
  hubId,
  accountId,
  retrying,
  onRetry,
  onDismiss,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(hit.retryAfterSeconds)
  const [reasonKey, setReasonKey] = useState<string | null>(
    HUB_VELOCITY_EXCEPTION_REASONS[0].value,
  )
  const [extraNote, setExtraNote] = useState('')

  const statusQ = useVelocityBayStatus(hit.vehicleId, {
    enabled: true,
    refetchInterval: 12_000,
  })
  const requestMut = useRequestVelocityException()

  useEffect(() => {
    setSecondsLeft(hit.retryAfterSeconds)
  }, [hit.retryAfterSeconds, hit.riskEventId])

  useEffect(() => {
    const t = window.setInterval(() => {
      setSecondsLeft((n) => (n <= 0 ? 0 : n - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [hit.riskEventId])

  const live: VelocityBayStatus | undefined = statusQ.data
  const grant = live?.active_grant
  const requested = Boolean(live?.exception_requested || requestMut.isSuccess)
  const canRetry = Boolean(grant) || secondsLeft <= 0 || live?.blocked === false

  const statusLine = useMemo(() => {
    if (grant) {
      return `Exception active · ${grant.uses_remaining}/${grant.max_uses} swap left`
    }
    if (requested) {
      return 'Exception requested · waiting on Risk review'
    }
    if (secondsLeft > 0) {
      return `Wait ${formatCountdown(secondsLeft)} before retry`
    }
    return 'Timer cleared · you can retry start'
  }, [grant, requested, secondsLeft])

  const submitRequest = async () => {
    if (!reasonKey) return
    const label = reasonLabel(HUB_VELOCITY_EXCEPTION_REASONS, reasonKey)
    const note =
      reasonKey === 'other'
        ? extraNote.trim()
        : extraNote.trim()
          ? `${label} — ${extraNote.trim()}`
          : label
    if (!note) {
      notifications.show({
        color: 'red',
        message: 'Add a short note for the exception request.',
      })
      return
    }
    try {
      await requestMut.mutateAsync({
        vehicle_id: hit.vehicleId,
        note,
        hub_id: hubId,
        account_id: accountId,
      })
      await statusQ.refetch()
      notifications.show({
        color: 'green',
        message: 'Exception sent to Risk. Stay on this bay — retry when granted.',
      })
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not request exception'),
      })
    }
  }

  return (
    <section className="rounded-[12px] border border-amber-500/40 bg-amber-500/5 p-4 shadow-[var(--sh)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
        Velocity gate
      </p>
      <p className="mt-1 text-[15px] font-bold text-[var(--tx)]">
        {live?.message || hit.message}
      </p>
      <p className="mt-1 text-[12.5px] text-[var(--mu)]">
        {reasonCopy(live?.reason || hit.reason)}
      </p>
      <p className="mt-3 text-[13px] font-semibold text-[var(--tx)]">{statusLine}</p>

      {grant ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={retrying} onClick={onRetry}>
            Continue with exception
          </Button>
          <Button variant="default" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            <Select
              label="Exception reason"
              data={HUB_VELOCITY_EXCEPTION_REASONS.map((r) => ({
                value: r.value,
                label: r.label,
              }))}
              value={reasonKey}
              onChange={setReasonKey}
              disabled={requested || requestMut.isPending}
            />
            <Textarea
              label={reasonKey === 'other' ? 'Note (required)' : 'Note (optional)'}
              minRows={2}
              value={extraNote}
              onChange={(e) => setExtraNote(e.currentTarget.value)}
              disabled={requested || requestMut.isPending}
              placeholder="What happened at the bay?"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="light"
              loading={requestMut.isPending}
              disabled={requested}
              onClick={() => {
                submitRequest()
              }}
            >
              {requested ? 'Exception requested' : 'Request exception'}
            </Button>
            <Button
              variant="default"
              loading={retrying}
              disabled={!canRetry}
              onClick={onRetry}
            >
              Retry start
            </Button>
            <Button variant="subtle" onClick={onDismiss}>
              Back
            </Button>
          </div>
          <p className="mt-3 text-[12px] text-[var(--mu)]">
            Agents cannot self-approve. Ops marks the Risk alert Reviewed OK to
            grant one bay swap.
          </p>
        </>
      )}
    </section>
  )
}

export function throttleHitFromError(
  err: unknown,
  vehicleId: string,
): VelocityThrottleHit | null {
  const ax = err as {
    response?: {
      data?: {
        error?: {
          code?: string
          message?: string
          details?: Record<string, unknown>
        }
      }
    }
  }
  const error = ax.response?.data?.error
  if (error?.code !== 'THROTTLED') return null
  const details = error.details || {}
  const retry = Number(details.retry_after_seconds ?? 0)
  return {
    vehicleId,
    message: error.message || 'Swap throttled for this vehicle.',
    reason: typeof details.reason === 'string' ? details.reason : undefined,
    retryAfterSeconds: Number.isFinite(retry) ? Math.max(0, retry) : 0,
    riskEventId:
      typeof details.risk_event_id === 'string' ? details.risk_event_id : undefined,
  }
}
