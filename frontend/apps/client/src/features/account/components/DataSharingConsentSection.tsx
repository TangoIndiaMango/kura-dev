import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  apiErrorMessage,
  AUTH_ME_QUERY_KEY,
  updateConsent,
  type MePayload,
} from '../../../lib/api/auth'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { notify } from '../../../shared/utils/notify'
import { useAuth } from '../../auth/AuthProvider'

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** E1.11 — DATA_SHARING is opt-in and withdrawable; SERVICE is shown read-only. */
export function DataSharingConsentSection() {
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const consent = me?.consent
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!consent) return null
  const sharing = consent.data_sharing.granted

  const save = (granted: boolean) => {
    setConfirmOpen(false)
    setBusy(true)
    updateConsent('DATA_SHARING', granted)
      .then((next) => {
        queryClient.setQueryData<MePayload>(AUTH_ME_QUERY_KEY, (old) =>
          old ? { ...old, consent: next } : old,
        )
        notify({
          title: granted ? 'Data sharing on' : 'Data sharing off',
          message: granted
            ? 'Thanks. You can turn this off at any time.'
            : 'Your data is left out of partner and programme reports from now on.',
          tone: 'success',
        })
      })
      .catch((err) => {
        notify({
          title: 'Could not update consent',
          message: apiErrorMessage(err),
          tone: 'error',
        })
      })
      .finally(() => setBusy(false))
  }

  const serviceSince = formatDate(consent.service.granted_at)
  const sharingNote = sharing
    ? `On since ${formatDate(consent.data_sharing.granted_at)}`
    : consent.data_sharing.withdrawn_at
      ? `Turned off ${formatDate(consent.data_sharing.withdrawn_at)}`
      : 'Off'

  return (
    <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
        Privacy and consent
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => (sharing ? setConfirmOpen(true) : save(true))}
        className="mt-3 flex w-full items-center justify-between gap-3 text-left disabled:opacity-60"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-[var(--kura-text)]">
            Share data with partners
          </span>
          <span className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
            Anonymised usage for partners / programmes. {sharingNote}.
          </span>
        </span>
        <span
          role="switch"
          aria-checked={sharing}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
            sharing
              ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]'
              : 'border-[var(--kura-border)] bg-[#D8DEE5]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${
              sharing ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      <p className="mt-3 border-t border-[var(--kura-border-subtle)] pt-3 text-[12px] leading-relaxed text-[var(--kura-muted)]">
        {consent.service.granted && serviceSince
          ? `You agreed to the KURA service terms on ${serviceSince}. This is needed to use KURA and ends only if you close your account.`
          : 'KURA service terms are needed to use KURA. You will be asked to agree when you verify your ID.'}
      </p>

      <ConfirmDialog
        opened={confirmOpen}
        title="Stop sharing data?"
        description="Your data will be left out of reports for financing partners and government programmes. Swaps and payments are not affected."
        confirmLabel="Stop sharing"
        cancelLabel="Keep sharing"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => save(false)}
      />
    </section>
  )
}
