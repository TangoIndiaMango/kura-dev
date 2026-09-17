import React from 'react'
import { Tick01Icon, Alert02Icon, Clock01Icon } from 'hugeicons-react'
import { formatNaira } from '../../../shared/utils/currency'
import type { OperatorSession } from '../../../shared/session/operatorTypes'

interface AccountProfileCardProps {
  initials: string
  name: string
  kuraId: string
  phone: string
  verifiedLabel: string
  kycStatus?: OperatorSession['kycStatus']
  profilePhotoUrl?: string | null
}

export const AccountProfileCard: React.FC<AccountProfileCardProps> = ({
  initials,
  name,
  kuraId,
  phone,
  verifiedLabel,
  kycStatus = 'NONE',
  profilePhotoUrl = null,
}) => {
  const verified = kycStatus === 'VERIFIED'
  const rejected = kycStatus === 'REJECTED'
  const none = kycStatus === 'NONE'
  const tone = verified
    ? 'text-[var(--kura-green)]'
    : rejected
      ? 'text-[var(--kura-coral)]'
      : none
        ? 'text-[var(--kura-muted)]'
        : 'text-[var(--kura-amber)]'
  const showPhoto = verified && Boolean(profilePhotoUrl)

  return (
    <section className="flex items-center gap-3.5 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
      {showPhoto ? (
        <img
          src={profilePhotoUrl!}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--kura-amber)] text-xl font-black text-[#003153]">
          {initials}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-base font-bold text-[var(--kura-text)]">{name}</h3>
          <span
            className={`rounded-full p-0.5 ${
              verified
                ? 'bg-[var(--kura-green)] text-white'
                : rejected
                  ? 'bg-[var(--kura-coral)] text-white'
                  : none
                    ? 'bg-[var(--kura-border)] text-[var(--kura-muted)]'
                    : 'bg-[var(--kura-amber)] text-[#003153]'
            }`}
          >
            {verified ? (
              <Tick01Icon size={12} className="stroke-[3]" />
            ) : rejected ? (
              <Alert02Icon size={12} />
            ) : (
              <Clock01Icon size={12} />
            )}
          </span>
        </div>
        <span className="truncate font-mono text-xs text-[var(--kura-muted)]">
          {kuraId} · {phone}
        </span>
        <span className={`mt-0.5 text-[11px] font-bold ${tone}`}>{verifiedLabel}</span>
      </div>
    </section>
  )
}

interface AccountStatsRowProps {
  savedNaira: number
  savedSince: string
  swapsCompleted: number
  swapsPerWeek: string
}

export const AccountStatsRow: React.FC<AccountStatsRowProps> = ({
  savedNaira,
  savedSince,
  swapsCompleted,
  swapsPerWeek,
}) => {
  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1 rounded-2xl border border-[var(--kura-green)]/20 bg-[var(--kura-green)]/10 p-4">
        <span className="text-[11.5px] text-[var(--kura-muted)]">Saved vs petrol</span>
        <span className="text-xl font-bold text-[var(--kura-green)]">
          {formatNaira(savedNaira, { fromKobo: true })}
        </span>
        <span className="text-[11px] text-[var(--kura-muted)]">{savedSince}</span>
      </div>
      <div className="flex flex-col gap-1 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
        <span className="text-[11.5px] text-[var(--kura-muted)]">Swaps completed</span>
        <span className="text-xl font-bold text-[var(--kura-text)]">{swapsCompleted}</span>
        <span className="text-[11px] text-[var(--kura-muted)]">{swapsPerWeek}</span>
      </div>
    </section>
  )
}
