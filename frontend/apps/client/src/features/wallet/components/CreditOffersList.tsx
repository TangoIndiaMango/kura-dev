import React, { useState } from 'react'
import { useVerifyPinMutation } from '@lib/api/auth-mutations'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'
import { PinDigitInputs } from '@shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '@shared/components/operator/OperatorPrimaryButton'
import {
  useAcceptOffer,
  type OfferAssignmentMineApi,
} from '../hooks/use-operator-offers'

export function CreditOffersList({
  offers,
}: {
  offers: OfferAssignmentMineApi[]
}) {
  const acceptMut = useAcceptOffer()
  const verifyPin = useVerifyPinMutation()
  const [acceptId, setAcceptId] = useState<string | null>(null)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)

  const busy = acceptMut.isPending || verifyPin.isPending
  const accepting = offers.find((o) => o.id === acceptId) ?? null

  const confirmAccept = async () => {
    if (!accepting) return
    const pin = pinDigits.join('')
    if (pin.length !== 4 || busy) return
    setError(null)
    try {
      const grant = await verifyPin.mutateAsync({ pin })
      await acceptMut.mutateAsync({
        id: accepting.id,
        pin_grant: grant.pin_grant,
        ...(accepting.amount_kobo != null
          ? { amount_kobo: accepting.amount_kobo }
          : {}),
      })
      setAcceptId(null)
      setPinDigits(['', '', '', ''])
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not accept offer'))
      setPinDigits(['', '', '', ''])
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5">
      <p className="text-[13px] font-bold text-[var(--kura-text)]">Offers</p>
      <ul className="mt-2 flex flex-col gap-2">
        {offers.map((o) => (
          <li
            key={o.id}
            className="rounded-xl border border-[var(--kura-border-subtle)] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--kura-text)]">
                  {o.offer_name}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--kura-muted)]">
                  {o.summary || o.offer_type}
                  {o.amount_kobo != null
                    ? ` · ${formatNaira(o.amount_kobo, { fromKobo: true })}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAcceptId(o.id)
                  setPinDigits(['', '', '', ''])
                  setError(null)
                }}
                className="shrink-0 rounded-lg bg-[var(--kura-teal)] px-2.5 py-1.5 text-[11px] font-bold text-white"
              >
                Accept
              </button>
            </div>
          </li>
        ))}
      </ul>

      {accepting ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--kura-border-subtle)] pt-3">
          <p className="text-[12px] font-semibold text-[var(--kura-text)]">
            PIN to accept {accepting.offer_name}
          </p>
          <PinDigitInputs
            values={pinDigits}
            onChange={setPinDigits}
            masked
            disabled={busy}
            error={Boolean(error)}
          />
          {error ? (
            <p className="text-[11px] font-semibold text-[var(--kura-coral)]">
              {error}
            </p>
          ) : null}
          <OperatorPrimaryButton
            tone="teal"
            disabled={busy || pinDigits.join('').length !== 4}
            onClick={() => {
              confirmAccept()
            }}
          >
            {busy ? 'Accepting…' : 'Confirm accept'}
          </OperatorPrimaryButton>
          <button
            type="button"
            disabled={busy}
            onClick={() => setAcceptId(null)}
            className="text-[12px] font-semibold text-[var(--kura-muted)]"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  )
}
