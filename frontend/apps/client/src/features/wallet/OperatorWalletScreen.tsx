import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  creditUiPresentation,
  resolveCreditUiState,
  useOperatorSession,
} from '@shared/session'
import { useAuth } from '../auth/AuthProvider'
import { apiErrorMessage } from '@lib/api/auth'
import { notify } from '@shared/utils/notify'
import { usePostData } from '@shared/hooks/api'
import {
  useOperatorWallet,
  useOperatorPayments,
  WALLET_API,
} from './hooks/use-operator-wallet'
import {
  loanDaysLeft,
  useCreditEligibility,
  useOperatorLoans,
} from './hooks/use-operator-credit'
import { useMyOffers } from './hooks/use-operator-offers'
import { WalletBalanceCard } from './components/WalletBalanceCard'
import { TransactionList } from './components/TransactionList'
import { FundWalletPanel } from './components/FundWalletPanel'
import { ActiveLoanBanner } from './components/ActiveLoanBanner'
import { CreditEligibilityPanel } from './components/CreditEligibilityPanel'
import { WalletCreditBlock } from './components/WalletCreditBlock'
import { toWalletTxItems } from './transactionItems'
import { ApplyCreditSheet } from './components/ApplyCreditSheet'
import { RepayCreditSheet } from './components/RepayCreditSheet'
import { OperatorBannerEmptyState } from '@shared/components/operator/OperatorBannerEmptyState'
import { OperatorReceiptScreen } from '../receipt/OperatorReceiptScreen'
import type { TabId } from '../layout/FloatingGlassBottomBar'

type WalletView = 'main' | 'fund' | 'receipt' | 'eligibility'
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
  const liveWallet = useOperatorWallet({ enabled: isAuthenticated })
  const livePayments = useOperatorPayments({ enabled: isAuthenticated, page_size: 10 })
  const eligibilityQ = useCreditEligibility({ enabled: isAuthenticated })
  const loansQ = useOperatorLoans({
    enabled: isAuthenticated && Boolean(eligibilityQ.eligibility?.credit_enabled),
  })
  const offersQ = useMyOffers({
    enabled: isAuthenticated && Boolean(eligibilityQ.eligibility?.offers_enabled),
  })
  const queryClient = useQueryClient()
  const [view, setView] = useState<WalletView>('main')
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [creditSheet, setCreditSheet] = useState<CreditSheet>('none')
  const fundMut = usePostData<
    { amount_naira: number; channel: string },
    unknown
  >(WALLET_API.fund, [WALLET_API.mine, WALLET_API.payments], {
    silentError: true,
  })

  useEffect(() => {
    if (!session) return
    const intent = consumeWalletIntent()
    if (intent === 'fund') setView('fund')
    if (intent === 'credit') setCreditSheet('apply')
    if (intent === 'schedule') setCreditSheet('repay')
    if (intent === 'eligibility') setView('eligibility')
  }, [session])

  if (!session) return null

  const balanceNaira = liveWallet.balanceNaira ?? 0
  const nuban = liveWallet.wallet ? liveWallet.nuban : null
  const bankLabel = liveWallet.wallet ? liveWallet.bankLabel : 'Virtual account'
  const accountName = liveWallet.accountName || session.name
  const syncedAt = liveWallet.wallet ? liveWallet.syncedAt : '—'
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

  if (view === 'fund') {
    return (
      <FundWalletPanel
        bank={bankLabel}
        nuban={nuban}
        accountName={accountName}
        onBack={() => setView('main')}
        demoFundEnabled={liveWallet.demoFundEnabled}
        demoFunding={fundMut.isPending}
        onDemoFund={async (amountNaira) => {
          try {
            await fundMut.mutateAsync({
              amount_naira: amountNaira,
              channel: 'NUBAN_TRANSFER',
            })
            notify({
              title: `₦${amountNaira.toLocaleString()} credited`,
              tone: 'success',
            })
            setView('main')
          } catch (err) {
            notify({
              title: apiErrorMessage(err, 'Could not credit wallet'),
              tone: 'error',
            })
          }
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

  const walletUsable = Boolean(nuban) || balanceNaira > 0 || txItems.length > 0

  // The PSP issues the NUBAN against an ID number; without one it never comes.
  const needsId = session.kycStatus === 'NONE' || session.kycStatus === 'REJECTED'
  let walletHero = needsId ? (
    <OperatorBannerEmptyState
      image="/illustrations/wallet-provisioning.png"
      badge="Action needed"
      title="Add your ID to get a transfer account"
      description="Your bank account number is issued in your name once your NIN or BVN is on file. Then you can top up from any banking app."
      actionLabel="Add NIN or BVN"
      onAction={() => {
        sessionStorage.setItem('kura_account_open', 'identity')
        onNavigateTab?.('account')
      }}
      footnote="Swaps still work in the meantime — pay cash at any hub."
    />
  ) : (
    <OperatorBannerEmptyState
      image="/illustrations/wallet-provisioning.png"
      badge="Setting up"
      title="Your transfer account is on the way"
      description="We are issuing a dedicated account in your name. It appears here once the bank confirms it, then you can top up from any banking app."
      footnote="Swaps still work in the meantime — pay cash at any hub."
    />
  )
  if (liveWallet.isLoading) {
    walletHero = (
      <div className="h-[196px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
    )
  } else if (walletUsable) {
    walletHero = (
      <WalletBalanceCard
        balanceNaira={balanceNaira}
        syncedAt={syncedAt}
        bankLabel={bankLabel}
        nuban={nuban}
        accountName={accountName}
        onFund={() => setView('fund')}
        onCredit={creditEnabled && creditUi ? openCreditFlow : undefined}
        creditLabel={creditUi?.heroCreditLabel}
        onSync={
          isAuthenticated
            ? () => {
                queryClient.invalidateQueries({ queryKey: [WALLET_API.mine] })
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {walletHero}

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

      {walletUsable ? (
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
      ) : null}

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
