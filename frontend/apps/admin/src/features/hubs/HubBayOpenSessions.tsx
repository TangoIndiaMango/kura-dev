import { useState } from 'react'
import { Button } from '@mantine/core'
import { AdminConfirmModal } from '@shared/components'
import type { OpenSwapSessionApi } from './hooks/use-bay-swap'

const STEP_LABEL: Record<string, string> = {
  STARTED: 'Return pending',
  RETURN_RECORDED: 'Issue pending',
  ISSUED: 'Confirm payment',
}

const STALE_MINUTES = 120 // the worker cancels sessions left this long

function minutesSince(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
}

type Action = 'restart' | 'cancel'

/** What Restart / Cancel really undo: an issued pack goes back to its bay,
 *  but a pack already returned stays at the bay (it was physically handed in). */
function confirmBody(action: Action, s: OpenSwapSessionApi) {
  const kept = s.returned_serial
    ? ` ${s.returned_serial} was already returned and stays at the bay${action === 'cancel' ? ' — hand it back to the rider if they leave without a swap' : ''}.`
    : ''
  const undo = 'A pack already issued goes back to its bay, a booking is closed and any Paystack payment is refunded.'
  return action === 'restart'
    ? `Cancels this session and starts a fresh walk-in for the same vehicle. ${undo}${kept}`
    : `${undo}${kept}`
}

type Props = {
  sessions: OpenSwapSessionApi[]
  busyId: string | null
  onContinue: (s: OpenSwapSessionApi) => void
  onRestart: (s: OpenSwapSessionApi) => Promise<void>
  onCancel: (s: OpenSwapSessionApi) => Promise<void>
}

/**
 * In-progress bay sessions at this hub. The server's swap status is the
 * truth: Continue picks the session up at its step, Restart cancels it and
 * starts again for the same vehicle, Cancel ends it (packs go back).
 */
export function HubBayOpenSessions({ sessions, busyId, onContinue, onRestart, onCancel }: Props) {
  const [pending, setPending] = useState<{ action: Action; session: OpenSwapSessionApi } | null>(null)
  if (sessions.length === 0) return null

  const plate = pending?.session.vehicle_plate ?? 'this vehicle'
  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
      <h3 className="text-[14px] font-bold text-[var(--tx)]">In progress at this bay</h3>
      <p className="mt-1 text-[12.5px] text-[var(--mu)]">
        Continue a session from where it stopped. Sessions left for {STALE_MINUTES / 60} hours are cancelled
        automatically.
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--bd)] rounded-[10px] border border-[var(--bd)]">
        {sessions.map((s) => {
          const mins = minutesSince(s.started_at ?? s.created_at)
          const busy = busyId === s.id
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-[var(--tx)]">
                  {s.vehicle_plate ?? 'Vehicle'}{' '}
                  <span className="font-medium text-[var(--mu)]">
                    · {s.reservation ? 'Booking' : 'Walk-in'} · {s.payment_mode}
                  </span>
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                  {STEP_LABEL[s.status] ?? s.status} · started {mins} min ago
                  {mins >= STALE_MINUTES - 30 ? ` · auto-cancels in ${Math.max(0, STALE_MINUTES - mins)} min` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="xs" color="brand" loading={busy} onClick={() => onContinue(s)}>
                  Continue
                </Button>
                <Button size="xs" variant="light" disabled={busy} onClick={() => setPending({ action: 'restart', session: s })}>
                  Restart
                </Button>
                <Button size="xs" variant="subtle" color="red" disabled={busy} onClick={() => setPending({ action: 'cancel', session: s })}>
                  Cancel
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <AdminConfirmModal
        opened={Boolean(pending)}
        onClose={() => setPending(null)}
        title={pending?.action === 'restart' ? `Restart ${plate}?` : `Cancel session for ${plate}?`}
        body={pending ? confirmBody(pending.action, pending.session) : ''}
        confirmLabel={pending?.action === 'restart' ? 'Restart session' : 'Cancel session'}
        confirmTone="danger"
        loading={Boolean(pending && busyId === pending.session.id)}
        onConfirm={async () => {
          if (!pending) return
          const { action, session } = pending
          await (action === 'restart' ? onRestart(session) : onCancel(session))
          setPending(null)
        }}
      />
    </section>
  )
}
