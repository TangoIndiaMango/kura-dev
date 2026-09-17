import React from 'react'
import type { CreditEligibilityApi, LoanApi } from '../hooks/use-operator-credit'
import type { OfferAssignmentMineApi } from '../hooks/use-operator-offers'
import { CreditStatusSection } from './CreditStatusSection'
import { CreditOffersComingSoonCard } from './CreditOffersComingSoonCard'

interface WalletCreditBlockProps {
  eligibility: CreditEligibilityApi | null
  eligibilityLoading: boolean
  creditEnabled: boolean
  offersEnabled: boolean
  offers: OfferAssignmentMineApi[]
  offersLoading: boolean
  loanActive: boolean
  activeLoan: LoanApi | null
  onOpen: () => void
}

/** A score the rider cannot act on yet is noise — only live credit or open offers show. */
export function WalletCreditBlock({
  eligibility,
  eligibilityLoading,
  creditEnabled,
  offersEnabled,
  offers,
  offersLoading,
  loanActive,
  activeLoan,
  onOpen,
}: WalletCreditBlockProps) {
  if (!creditEnabled && !offersEnabled) {
    return <CreditOffersComingSoonCard loading={eligibilityLoading} />
  }

  const hasOpenOffers =
    offersEnabled && offers.some((offer) => offer.status === 'OFFERED')
  const actionable =
    loanActive || Boolean(eligibility?.eligible && creditEnabled)
  if (!actionable && !hasOpenOffers) return null

  return (
    <CreditStatusSection
      loading={eligibilityLoading}
      eligibility={eligibility}
      loanActive={loanActive}
      principalNaira={
        activeLoan ? Math.ceil(activeLoan.remaining_due_kobo / 100) : undefined
      }
      dailyDebitNaira={
        activeLoan
          ? Math.ceil(activeLoan.daily_installment_kobo / 100)
          : undefined
      }
      offers={offersEnabled ? offers : []}
      offersLoading={offersEnabled && offersLoading}
      onOpen={onOpen}
    />
  )
}
