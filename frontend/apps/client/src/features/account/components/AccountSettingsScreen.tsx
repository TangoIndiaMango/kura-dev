import React, { useEffect, useState } from 'react'
import {
  DEFAULT_OPERATOR_SETTINGS,
  type OperatorAccountSettings,
  type OtpChannelPreference,
} from '../../../shared/session'
import { KuraIllustrationModal } from '../../../shared/components'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { OperatorSubtleButton } from '../../../shared/components/operator/OperatorSubtleButton'
import { notify } from '../../../shared/utils/notify'
import { DataSharingConsentSection } from './DataSharingConsentSection'

const LANGUAGE_OPTIONS: Array<{
  value: OperatorAccountSettings['language']
  label: string
}> = [
  { value: 'en', label: 'English' },
  { value: 'pcm', label: 'Pidgin' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ha', label: 'Hausa' },
  { value: 'ig', label: 'Igbo' },
]

interface AccountSettingsScreenProps {
  settings: OperatorAccountSettings
  email: string | null
  emailVerified: boolean
  onUpdate: (patch: Partial<OperatorAccountSettings>) => void
  onSaveEmail: (email: string) => void
  /** Clears verified email so rider can set a new one. */
  onClearEmail?: () => void
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 border-b border-[var(--kura-border-subtle)] px-4 py-3.5 text-left last:border-b-0"
    >
      <span className="text-[14px] font-semibold text-[var(--kura-text)]">
        {label}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          checked
            ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]'
            : 'border-[var(--kura-border)] bg-[#D8DEE5]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({
  settings,
  email,
  emailVerified,
  onUpdate,
  onSaveEmail,
  onClearEmail,
}) => {
  const s = settings ?? DEFAULT_OPERATOR_SETTINGS
  const [emailDraft, setEmailDraft] = useState(email ?? '')
  const [editing, setEditing] = useState(!emailVerified)
  const [changeConfirmOpen, setChangeConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  useEffect(() => {
    setEmailDraft(email ?? '')
    setEditing(!emailVerified)
  }, [email, emailVerified])

  const setOtpChannel = (channel: OtpChannelPreference) => {
    if (channel === 'email' && !emailVerified) return
    onUpdate({ otpChannel: channel })
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.trim())

  const saveEmail = () => {
    if (!emailOk) return
    const next = emailDraft.trim()
    onSaveEmail(next)
    setEditing(false)
    setSuccessOpen(true)
    notify({
      title: 'Email saved',
      message: 'Sign-in codes stay on SMS. Email is for receipts and alerts.',
      tone: 'success',
    })
  }

  const beginChangeEmail = () => {
    setChangeConfirmOpen(false)
    onClearEmail?.()
    onUpdate({ otpChannel: 'sms' })
    setEmailDraft('')
    setEditing(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
        Alert settings save to your Kura account. Turning one off stops its SMS; you still see it in your inbox. Sign-in, PIN and security codes always send.
      </p>
      <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
        <SettingToggle
          label="SMS after every swap"
          checked={s.smsAfterSwap}
          onChange={(smsAfterSwap) => onUpdate({ smsAfterSwap })}
        />
        <SettingToggle
          label="Payment and receipt alerts"
          checked={s.paymentReceiptAlerts}
          onChange={(paymentReceiptAlerts) => onUpdate({ paymentReceiptAlerts })}
        />
        <SettingToggle
          label="Plan expiry reminders"
          checked={s.planExpiryReminders}
          onChange={(planExpiryReminders) => onUpdate({ planExpiryReminders })}
        />
        <SettingToggle
          label="Loan updates"
          checked={s.loanUpdates}
          onChange={(loanUpdates) => onUpdate({ loanUpdates })}
        />
      </section>

      <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
          Contact email
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--kura-muted)]">
          Used for receipts and alerts. Sign-in OTP stays on SMS.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOtpChannel('sms')}
            className={`rounded-xl border px-3 py-3 text-[13px] font-bold transition ${
              s.otpChannel === 'sms'
                ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
                : 'border-[var(--kura-border)] text-[var(--kura-text)]'
            }`}
          >
            SMS
          </button>
          <button
            type="button"
            disabled={!emailVerified}
            onClick={() => setOtpChannel('email')}
            className={`rounded-xl border px-3 py-3 text-[13px] font-bold transition ${
              s.otpChannel === 'email'
                ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
                : 'border-[var(--kura-border)] text-[var(--kura-text)] disabled:opacity-40'
            }`}
          >
            Email
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-semibold text-[var(--kura-muted)]">
              Email address
            </label>
            {emailVerified && !editing ? (
              <span className="rounded-md bg-[var(--kura-teal)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--kura-teal-bright)]">
                Saved
              </span>
            ) : null}
          </div>

          {emailVerified && !editing ? (
            <>
              <input
                type="email"
                value={email ?? ''}
                disabled
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg)]/60 px-3 py-2.5 text-[14px] text-[var(--kura-muted)] outline-none"
              />
              <OperatorSubtleButton
                fullWidth={false}
                className="mt-1 self-start"
                onClick={() => setChangeConfirmOpen(true)}
              >
                Change email
              </OperatorSubtleButton>
            </>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="you@email.com"
                className="min-w-0 flex-1 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg)] px-3 py-2.5 text-[14px] text-[var(--kura-text)] outline-none focus:border-[var(--kura-teal)]"
              />
              <button
                type="button"
                disabled={!emailOk}
                onClick={saveEmail}
                className="shrink-0 rounded-xl bg-[var(--kura-teal)] px-3 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
          Language
        </p>
        <select
          value={s.language}
          onChange={(e) =>
            onUpdate({
              language: e.target.value as OperatorAccountSettings['language'],
            })
          }
          className="mt-2 w-full appearance-none rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg)] px-3 py-3 text-[14px] font-semibold text-[var(--kura-text)] outline-none focus:border-[var(--kura-teal)]"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      <DataSharingConsentSection />

      <ConfirmDialog
        opened={changeConfirmOpen}
        title="Change email?"
        description="Sign-in codes stay on SMS. Update the address used for receipts and alerts."
        confirmLabel="Change email"
        cancelLabel="Keep current"
        onCancel={() => setChangeConfirmOpen(false)}
        onConfirm={beginChangeEmail}
      />

      <KuraIllustrationModal
        opened={successOpen}
        onClose={() => setSuccessOpen(false)}
        illustrationId="account-verified"
        title="Email saved"
        description={`${(email ?? emailDraft) || 'Your email'} is on file for receipts and alerts.`}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccessOpen(false),
        }}
      />
    </div>
  )
}
