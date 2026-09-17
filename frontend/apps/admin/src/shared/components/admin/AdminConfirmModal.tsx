import { useEffect, useState } from 'react'
import { Button, NumberInput, PasswordInput, Select, Textarea } from '@mantine/core'
import { KuraIllustrationModal } from '../KuraIllustrationModal'
import type { KuraIllustrationId } from '../../illustrations/catalog'

export interface AdminConfirmReasonOption {
  value: string
  label: string
}

export interface AdminConfirmModalProps {
  opened: boolean
  onClose: () => void
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  reasonRequired?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  /** When set, reason is a select. */
  reasonOptions?: AdminConfirmReasonOption[]
  /** When set (and no reasonOptions), reason is a number input. */
  reasonNumber?: { min?: number; max: number; suffix?: string }
  confirmTone?: 'primary' | 'danger'
  /** confirm-action (default) or confirm-delete for destructive */
  illustrationId?: KuraIllustrationId
  loading?: boolean
  /**
   * Require a masked supervisor PIN before confirm.
   * PIN is validated locally and never passed to onConfirm / parents.
   */
  pinRequired?: boolean
  /** Max digits (and default exact length when pinMinLength omitted). */
  pinLength?: number
  /** Allow shorter PINs (e.g. agent 4–8). Defaults to pinLength. */
  pinMinLength?: number
  pinLabel?: string
  validatePin?: (pin: string) => boolean | Promise<boolean>
  maxPinAttempts?: number
  /** Parent-controlled lockout (e.g. bay session). */
  pinLocked?: boolean
  onPinLockout?: () => void
  pinHint?: string
  pinLockedMessage?: string
  /** Escape hatch under the pin/OTP field (e.g. pay with cash). */
  pinAltAction?: { label: string; onClick: () => void }
  /** Reason string only. Never receives PIN/OTP. */
  onConfirm: (reason?: string) => void | Promise<void>
}

const fieldStyles = {
  input: {
    background: 'var(--in)',
    borderColor: 'var(--bd)',
    color: 'var(--tx)',
  },
}

/**
 * Side action confirm (560px) — matches Admin Modal Illustrations confirm cards.
 * Parent opens success via `KuraIllustrationModal` (side for ops, center for notes).
 */
export function AdminConfirmModal({
  opened,
  onClose,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  reasonRequired = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter a reason…',
  reasonOptions,
  reasonNumber,
  confirmTone = 'primary',
  illustrationId = confirmTone === 'danger' ? 'confirm-delete' : 'confirm-action',
  loading = false,
  pinRequired = false,
  pinLength = 6,
  pinMinLength,
  pinLabel = 'Supervisor PIN',
  validatePin,
  maxPinAttempts = 3,
  pinLocked: pinLockedProp = false,
  onPinLockout,
  pinHint,
  pinLockedMessage,
  pinAltAction,
  onConfirm,
}: AdminConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [localLocked, setLocalLocked] = useState(false)

  const locked = pinLockedProp || localLocked

  useEffect(() => {
    if (!opened) return
    setReason('')
    setPin('')
    setPinError(null)
    // Keep attempt/lock state across reopen within same parent session when pinLockedProp
    if (!pinLockedProp) {
      setAttempts(0)
      setLocalLocked(false)
    }
  }, [opened, pinLockedProp])

  const numberMin = reasonNumber?.min ?? 1
  const numberMax = reasonNumber?.max ?? 60
  const numberValue = Number.parseInt(reason, 10)
  const numberOk =
    !reasonNumber ||
    (Number.isFinite(numberValue) &&
      numberValue >= numberMin &&
      numberValue <= numberMax)
  const reasonOk =
    !reasonRequired ||
    (reasonNumber ? numberOk : reason.trim().length > 0)
  const pinMin = pinMinLength ?? pinLength
  const pinDigitsOk =
    !pinRequired ||
    (pin.length >= pinMin && pin.length <= pinLength && /^\d+$/.test(pin))
  const canConfirm = reasonOk && pinDigitsOk && !locked && !loading

  const handleClose = () => {
    setReason('')
    setPin('')
    setPinError(null)
    onClose()
  }

  const resolveReason = (): string | undefined => {
    if (!reasonRequired && !reason.trim()) return undefined
    if (reasonNumber) {
      return Number.isFinite(numberValue) ? String(numberValue) : undefined
    }
    if (reasonOptions?.length) {
      const hit = reasonOptions.find((o) => o.value === reason)
      return hit?.label ?? reason.trim()
    }
    return reason.trim() || undefined
  }

  const handleConfirm = async () => {
    if (!canConfirm) return

    if (pinRequired) {
      if (locked) return
      let ok = false
      try {
        ok = validatePin ? await Promise.resolve(validatePin(pin)) : false
      } catch {
        ok = false
      }
      if (!ok) {
        const next = attempts + 1
        setAttempts(next)
        setPin('')
        if (next >= maxPinAttempts) {
          setLocalLocked(true)
          setPinError(pinLockedMessage ?? `${pinLabel} locked for this session.`)
          onPinLockout?.()
        } else {
          const left = maxPinAttempts - next
          setPinError(
            `Incorrect ${pinLabel}. ${left} attempt${left === 1 ? '' : 's'} left`,
          )
        }
        return
      }
    }

    await onConfirm(resolveReason())
    setReason('')
    setPin('')
    setPinError(null)
  }

  return (
    <KuraIllustrationModal
      opened={opened}
      onClose={handleClose}
      layout="side"
      illustrationId={illustrationId}
      title={title}
      description={body}
      closeOnClickOutside={!loading}
      primaryAction={{
        label: confirmLabel,
        loading,
        disabled: !canConfirm,
        tone: confirmTone === 'danger' ? 'danger' : 'primary',
        onClick: handleConfirm,
      }}
      secondaryAction={{
        label: cancelLabel,
        onClick: handleClose,
        disabled: loading,
      }}
    >
      <div className="mt-1 flex w-full flex-col gap-3 text-left">
        {reasonRequired ? (
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-[var(--mu)]">
              {reasonLabel}
              <span className="text-[#C0392B]"> *</span>
            </label>
            {reasonOptions?.length ? (
              <Select
                data={reasonOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={reason || null}
                onChange={(v) => setReason(v ?? '')}
                placeholder={reasonPlaceholder}
                searchable={false}
                styles={fieldStyles}
              />
            ) : reasonNumber ? (
              <NumberInput
                value={reason === '' ? undefined : numberValue}
                onChange={(v) =>
                  setReason(typeof v === 'number' && Number.isFinite(v) ? String(v) : '')
                }
                min={numberMin}
                max={numberMax}
                clampBehavior="strict"
                placeholder={reasonPlaceholder}
                suffix={reasonNumber.suffix ? ` ${reasonNumber.suffix}` : undefined}
                styles={fieldStyles}
              />
            ) : (
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.currentTarget.value)}
                placeholder={reasonPlaceholder}
                minRows={3}
                styles={fieldStyles}
              />
            )}
          </div>
        ) : null}

        {pinRequired ? (
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-[var(--mu)]">
              {pinLabel}
              <span className="text-[#C0392B]"> *</span>
            </label>
            <PasswordInput
              value={pin}
              onChange={(e) => {
                const next = e.currentTarget.value.replace(/\D/g, '').slice(0, pinLength)
                setPin(next)
                setPinError(null)
              }}
              placeholder={
                pinMin === pinLength
                  ? `${pinLength}-digit code`
                  : `${pinMin}–${pinLength}-digit code`
              }
              autoComplete="off"
              disabled={locked}
              styles={fieldStyles}
            />
            {pinError ? (
              <p className="mt-1.5 text-[12px] font-medium text-[#C0392B]">{pinError}</p>
            ) : locked ? (
              <p className="mt-1.5 text-[12px] font-medium text-[#C0392B]">
                {pinLockedMessage ?? `${pinLabel} locked for this session.`}
              </p>
            ) : pinHint ? (
              <p className="mt-1.5 text-[11px] text-[var(--mu)]">{pinHint}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-[var(--mu)]">
                Ask a supervisor. Code is never stored in the audit trail.
              </p>
            )}
            {pinAltAction ? (
              <Button
                mt="sm"
                variant="subtle"
                fullWidth
                onClick={pinAltAction.onClick}
                disabled={loading}
              >
                {pinAltAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </KuraIllustrationModal>
  )
}
