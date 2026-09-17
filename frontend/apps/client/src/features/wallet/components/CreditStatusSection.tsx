import React from 'react'
import { Skeleton } from '@mantine/core'
import type { CreditEligibilityApi } from '../hooks/use-operator-credit'
import type { OfferAssignmentMineApi } from '../hooks/use-operator-offers'
import { WalletCreditSummary } from './WalletCreditSummary'
import { CreditOffersList } from './CreditOffersList'

interface CreditStatusSectionProps {
  loading: boolean
  eligibility: CreditEligibilityApi | null
  loanActive: boolean
  principalNaira?: number
  dailyDebitNaira?: number
  offers: OfferAssignmentMineApi[]
  offersLoading: boolean
  onOpen: () => void
}

export function CreditStatusSection({
  loading,
  eligibility,
  loanActive,
  principalNaira,
  dailyDebitNaira,
  offers,
  offersLoading,
  onOpen,
}: CreditStatusSectionProps) {
  if (loading || !eligibility) {
    return (
      <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5">
        <Skeleton height={56} width={104} mb={8} radius="md" />
        <Skeleton height={12} width="70%" radius="sm" />
      </section>
    )
  }

  const openOffers = offers.filter((o) => o.status === 'OFFERED')

  return (
    <div className="flex flex-col gap-3">
      <WalletCreditSummary
        score={eligibility.score}
        limitNaira={Math.floor(eligibility.recommended_limit_kobo / 100)}
        loanActive={loanActive || eligibility.loan_active}
        kycVerified={eligibility.kyc_verified}
        principalNaira={principalNaira}
        dailyDebitNaira={dailyDebitNaira}
        onOpen={onOpen}
      />

      {offersLoading ? (
        <Skeleton height={72} radius="lg" />
      ) : openOffers.length > 0 ? (
        <CreditOffersList offers={openOffers} />
      ) : null}
    </div>
  )
}
