import React, { useEffect, useState } from 'react'
import {
  creditUiPresentation,
  resolveCreditUiState,
  useOperatorSession,
} from '@shared/session'
import { useAuth } from '../auth/AuthProvider'
import { useOperatorPayments } from './hooks/use-operator-wallet'
import {
  loanDaysLeft,
  useCreditEligibility,
  useOperatorLoans,
} from './hooks/use-operator-credit'
import { useMyOffers } from './hooks/use-operator-offers'
import { TransactionList } from './components/TransactionList'
import { ActiveLoanBanner } from './components/ActiveLoanBanner'
import { CreditEligibilityPanel } from './components/CreditEligibilityPanel'
import { WalletCreditBlock } from './components/WalletCreditBlock'
import { toWalletTxItems } from './transactionItems'
import { ApplyCreditSheet } from './components/ApplyCreditSheet'
import { RepayCreditSheet } from './components/RepayCreditSheet'
import { OperatorReceiptScreen } from '../receipt/OperatorReceiptScreen'
import type { TabId } from '../layout/FloatingGlassBottomBar'

type WalletView = 'main' | 'receipt' | 'eligibility'
type CreditSheet = 'none' | 'apply' | 'repay'

interface OperatorWalletScreenProps {
  onNavigateTab?: (tab: TabId) => void
  onSeeHistory?: () => void
  onOpenReceipt?: (receiptId: string) => void
}

const WALLET_INTENT_KEY = 'kura_wallet_intent'

function consumeWalletIntent(): string | null {
  const raw = sessionStorage.getItem(WALLET_INTENT_KEY)
  if (!raw) return null
  sessionStorage.removeItem(WALLET_INTENT_KEY)
  return raw
}

export const OperatorWalletScreen: React.FC<OperatorWalletScreenProps> = ({
  onNavigateTab,
  onSeeHistory,
  onOpenReceipt,
}) => {
  const { session } = useOperatorSession()
  const { isAuthenticated } = useAuth()
  const livePayments = useOperatorPayments({ enabled: isAuthenticated, page_size: 10 })
  const eligibilityQ = useCreditEligibility({ enabled: isAuthenticated })
  const loansQ = useOperatorLoans({
    enabled: isAuthenticated && Boolean(eligibilityQ.eligibility?.credit_enabled),
  })
  const offersQ = useMyOffers({
    enabled: isAuthenticated && Boolean(eligibilityQ.eligibility?.offers_enabled),
  })
  const [view, setView] = useState<WalletView>('main')
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [creditSheet, setCreditSheet] = useState<CreditSheet>('none')

  useEffect(() => {
    if (!session) return
    const intent = consumeWalletIntent()
    if (intent === 'credit') setCreditSheet('apply')
    if (intent === 'schedule') setCreditSheet('repay')
    if (intent === 'eligibility') setView('eligibility')
  }, [session])

  if (!session) return null

  const eligibility = eligibilityQ.eligibility
  const creditEnabled = Boolean(eligibility?.credit_enabled)
  const offersEnabled = Boolean(eligibility?.offers_enabled)
  const activeLoan = loansQ.activeLoan
  const loanActive = Boolean(eligibility?.loan_active || activeLoan)
  const creditState = eligibility
    ? resolveCreditUiState({
        score: eligibility.score,
        kycVerified: eligibility.kyc_verified,
        loanActive,
      })
    : null
  const creditUi = creditState
    ? creditUiPresentation(creditState, {
        score: eligibility?.score ?? 0,
        limitNaira: Math.floor((eligibility?.recommended_limit_kobo ?? 0) / 100),
        principalNaira: activeLoan
          ? Math.ceil(activeLoan.remaining_due_kobo / 100)
          : undefined,
        dailyDebitNaira: activeLoan
          ? Math.ceil(activeLoan.daily_installment_kobo / 100)
          : undefined,
      })
    : null

  const openCreditFlow = () => {
    if (!creditEnabled || !creditState) return
    if (creditState === 'eligible') setCreditSheet('apply')
    else if (creditState === 'drawn') setCreditSheet('repay')
    else setView('eligibility')
  }

  if (view === 'receipt' && receiptId) {
    return (
      <OperatorReceiptScreen
        receiptId={receiptId}
        onBack={() => {
          setReceiptId(null)
          setView('main')
        }}
      />
    )
  }

  if (view === 'eligibility' && eligibility) {
    return (
      <CreditEligibilityPanel
        score={eligibility.score}
        threshold={eligibility.threshold}
        kycVerified={eligibility.kyc_verified}
        loanActive={loanActive}
        progress={eligibility.progress}
        onBack={() => setView('main')}
        onContinue={
          creditEnabled
            ? () => {
                setView('main')
                setCreditSheet('apply')
              }
            : undefined
        }
      />
    )
  }

  const txItems = isAuthenticated
    ? toWalletTxItems(livePayments.payments)
    : []

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Payments</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--kura-muted)]">
          Swaps and plans are paid with Paystack — card, bank transfer or USSD.
        </p>
      </header>

      {creditEnabled && activeLoan ? (
        <ActiveLoanBanner
          principalNaira={Math.ceil(activeLoan.remaining_due_kobo / 100)}
          daysLeft={loanDaysLeft(activeLoan.due_at)}
          dailyDebitNaira={Math.ceil(activeLoan.daily_installment_kobo / 100)}
          onRepay={() => setCreditSheet('repay')}
        />
      ) : null}

      <WalletCreditBlock
        eligibility={eligibility}
        eligibilityLoading={eligibilityQ.isLoading}
        creditEnabled={creditEnabled}
        offersEnabled={offersEnabled}
        offers={offersQ.offers}
        offersLoading={offersQ.isLoading}
        loanActive={loanActive}
        activeLoan={activeLoan}
        onOpen={openCreditFlow}
      />

      <TransactionList
        items={txItems}
        pageSize={10}
        loading={livePayments.isLoading}
        onSeeAll={onSeeHistory}
        onItemClick={(id, itemReceiptId) => {
          if (onOpenReceipt && itemReceiptId) {
            onOpenReceipt(itemReceiptId)
            return
          }
          setReceiptId(itemReceiptId ?? id)
          setView('receipt')
        }}
      />

      <ApplyCreditSheet
        opened={creditSheet === 'apply' && creditEnabled}
        maxAmountKobo={eligibility?.recommended_limit_kobo ?? 5_000_000}
        onClose={() => setCreditSheet('none')}
      />
      {activeLoan ? (
        <RepayCreditSheet
          opened={creditSheet === 'repay'}
          loan={activeLoan}
          onClose={() => setCreditSheet('none')}
        />
      ) : null}
    </div>
  )
}
