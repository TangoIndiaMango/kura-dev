import React from 'react'
import {
  useCreditEligibility,
  useOperatorLoans,
} from '../../wallet/hooks/use-operator-credit'
import { CreditScoreBanner } from './CreditScoreBanner'

interface HomeCreditScoreBlockProps {
  enabled: boolean
  onNavigateWallet: (intent: 'credit' | 'schedule' | 'eligibility') => void
}

/** Live credit gauge on Home — gated so inactive riders skip the fetch. */
export function HomeCreditScoreBlock({
  enabled,
  onNavigateWallet,
}: HomeCreditScoreBlockProps) {
  const eligibilityQ = useCreditEligibility({ enabled })
  const loansQ = useOperatorLoans({
    enabled: enabled && Boolean(eligibilityQ.eligibility),
  })

  if (!enabled) return null
  if (eligibilityQ.isLoading) return null

  const eligibility = eligibilityQ.eligibility
  if (!eligibility) return null

  const activeLoan = loansQ.activeLoan
  const loanActive = eligibility.loan_active || Boolean(activeLoan)
  /** Home stays action-only: a score a rider cannot act on yet lives in Wallet. */
  const actionable =
    loanActive || (eligibility.eligible && eligibility.credit_enabled)
  if (!actionable) return null

  const intent: 'credit' | 'schedule' = loanActive ? 'schedule' : 'credit'

  return (
    <CreditScoreBanner
      score={eligibility.score}
      limitNaira={Math.floor(eligibility.recommended_limit_kobo / 100)}
      loanActive={loanActive}
      kycVerified={eligibility.kyc_verified}
      principalNaira={
        activeLoan ? Math.ceil(activeLoan.remaining_due_kobo / 100) : undefined
      }
      dailyDebitNaira={
        activeLoan
          ? Math.ceil(activeLoan.daily_installment_kobo / 100)
          : undefined
      }
      onOpenCredit={() => onNavigateWallet(intent)}
    />
  )
}
