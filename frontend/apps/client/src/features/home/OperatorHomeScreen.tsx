import React, { useMemo } from 'react'
import type { TabId } from '../layout/FloatingGlassBottomBar'
import {
  deriveNextAction,
  liveReservations,
  useOperatorSession,
  vehicleCoveredByPlan,
  type OperatorActiveReservation,
} from '../../shared/session'
import { useAuth } from '../auth/AuthProvider'
import { useOperatorWallet } from '../wallet/hooks/use-operator-wallet'
import { useMyReservations, useMySwaps } from '../swap/hooks/use-swap-live'
import { uiPaymentMode } from '../swap/swapLiveMap'
import { useHomeLiveData } from './hooks/use-home-live'
import { nowMs } from '../../shared/time/serverClock'
import { BatteryHeroWithSwitcher } from './components/BatteryStatusHero'
import { ActiveSwapBanner } from './components/ActiveSwapBanner'
import { QuickActionsRow } from './components/QuickActionsRow'
import { NextActionCard } from './components/NextActionCard'
import { RecentActivityList } from './components/RecentActivityList'
import { HomeCreditScoreBlock } from './components/HomeCreditScoreBlock'
import { HomeOnboardingChecklist } from './components/HomeOnboardingChecklist'
import { swapsPausedMessage } from '../../shared/session/accountStatus'

function hasDisplayName(name: string | undefined | null) {
  const n = (name ?? '').trim()
  if (!n) return false
  // Backend placeholder for new accounts is "Rider 1234" (last 4 of phone).
  return !/^rider(\s+\d{4})?$/i.test(n)
}

interface OperatorHomeScreenProps {
  onNavigateTab: (tab: TabId) => void
  onSeeHistory?: () => void
  onOpenReceipt?: (receiptId: string) => void
}

export const OperatorHomeScreen: React.FC<OperatorHomeScreenProps> = ({
  onNavigateTab,
  onSeeHistory,
  onOpenReceipt,
}) => {
  const { session } = useOperatorSession()
  const { isAuthenticated } = useAuth()
  const liveWallet = useOperatorWallet({ enabled: isAuthenticated })
  const {
    vehicles,
    activityItems,
    vehiclesLoading,
    activityLoading,
  } = useHomeLiveData()
  const liveHolds = useMyReservations({
    enabled: isAuthenticated,
    status: 'CONFIRMED',
  })
  const liveSwaps = useMySwaps({ enabled: isAuthenticated, page_size: 1 })

  const holds = useMemo(() => {
    const mapped: OperatorActiveReservation[] = liveHolds.reservations
      .filter((r) => r.status === 'CONFIRMED' || r.status === 'PENDING')
      .map((r) => ({
        id: r.id,
        code: r.code,
        hubId: r.hub,
        hubName: r.hub_name,
        vehicleId: r.vehicle,
        vehicleLabel: r.vehicle_plate,
        expiresAt: new Date(r.expires_at).getTime(),
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        paymentMode: uiPaymentMode(r.payment_mode),
        ...(r.qr ? { qr: r.qr } : {}),
      }))
    return liveReservations(mapped, nowMs())
  }, [liveHolds.reservations])

  if (!session) return null

  const balanceNaira = liveWallet.balanceNaira ?? 0
  const hasLivePass = holds.length > 0
  const swapsSettled = !liveSwaps.isLoading
  const hasCompletedFirstSwap = swapsSettled && liveSwaps.swaps.length > 0
  const nextAction = deriveNextAction({
    vehicleCount: vehicles.length,
    hasPin: session.hasPin,
    hasCompletedFirstSwap,
    anyPlanCovered: vehicles.some((v) => vehicleCoveredByPlan(v.plan)),
    walletBalanceNaira: balanceNaira,
  })

  const showQuickActions =
    !vehiclesLoading && (vehicles.length > 0 || hasCompletedFirstSwap)
  const needsIdentity =
    session.kycStatus === 'NONE' || session.kycStatus === 'REJECTED'
  const needsPhotos = session.kycPhotosRequested

  const openSwapHub = () => {
    sessionStorage.setItem('kura_swap_intent', 'hub')
    onNavigateTab('swap')
  }
  const openHoldPass = (holdId: string) => {
    sessionStorage.setItem('kura_swap_intent', `pass:${holdId}`)
    onNavigateTab('swap')
  }
  const openWallet = () => onNavigateTab('wallet')
  const openWalletCredit = (
    intent: 'credit' | 'schedule' | 'eligibility',
  ) => {
    sessionStorage.setItem('kura_wallet_intent', intent)
    onNavigateTab('wallet')
  }

  const checklistItems = [
    { id: 'account', label: 'Account created', done: true as boolean },
    {
      id: 'profile',
      label: 'Add your name',
      done: hasDisplayName(session.name),
      tab: 'account' as TabId,
    },
    {
      id: 'pin',
      label: 'Set your PIN',
      done: session.hasPin,
      tab: 'account' as TabId,
    },
    {
      id: 'vehicle',
      label: 'Add a vehicle',
      done: vehicles.length > 0,
      tab: 'swap' as TabId,
    },
    {
      id: 'swap',
      label: 'Complete first swap',
      done: hasCompletedFirstSwap,
      tab: 'swap' as TabId,
    },
  ]

  const showChecklist =
    !vehiclesLoading &&
    swapsSettled &&
    !liveHolds.isLoading &&
    !hasCompletedFirstSwap &&
    !hasLivePass

  const swapsPaused = swapsPausedMessage(session.accountStatus)

  return (
    <div className="flex flex-col gap-4">
      {swapsPaused ? (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--kura-coral)]/40 bg-[var(--kura-coral)]/10 px-4 py-3.5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-coral)]">
            Swaps paused
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--kura-text)]">{swapsPaused}</p>
        </div>
      ) : null}

      {holds.length > 0 ? (
        <ActiveSwapBanner holds={holds} onOpen={openHoldPass} />
      ) : null}

      <BatteryHeroWithSwitcher
        vehicles={vehicles}
        loading={vehiclesLoading}
        onBookSwap={() => {
          sessionStorage.setItem('kura_swap_intent', 'book')
          onNavigateTab('swap')
        }}
        onAddVehicle={() => {
          sessionStorage.setItem('kura_swap_intent', 'book')
          onNavigateTab('swap')
        }}
      />



      <HomeCreditScoreBlock
        enabled={isAuthenticated}
        onNavigateWallet={openWalletCredit}
      />

      {showQuickActions ? (
        <QuickActionsRow
          onNavigateTab={onNavigateTab}
          hasActivePass={hasLivePass}
          onOpenSwaps={() => {
            const primary = holds[0]
            if (primary) openHoldPass(primary.id)
            else openSwapHub()
          }}
          onOpenWallet={openWallet}
        />
      ) : null}

      {showChecklist ? (
        <HomeOnboardingChecklist
          items={checklistItems}
          onOpen={(item) => {
            if (item.id === 'profile') {
              sessionStorage.setItem('kura_account_open', 'name')
              onNavigateTab('account')
              return
            }
            if (item.id === 'pin') {
              sessionStorage.setItem('kura_account_open', 'pin')
              onNavigateTab('account')
              return
            }
            if (item.tab === 'wallet') openWallet()
            else if (item.tab === 'swap') {
              sessionStorage.setItem('kura_swap_intent', 'book')
              onNavigateTab('swap')
            } else if (item.tab) onNavigateTab(item.tab)
          }}
        />
      ) : nextAction && !hasLivePass ? (
        <NextActionCard
          action={nextAction}
          onAction={() => {
            if (nextAction.id === 'pin') {
              sessionStorage.setItem('kura_account_open', 'pin')
              onNavigateTab('account')
            } else if (nextAction.tab === 'wallet') openWallet()
            else onNavigateTab(nextAction.tab)
          }}
        />
      ) : null}

      {needsPhotos ? (
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('kura_account_open', 'identity')
            onNavigateTab('account')
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--kura-coral)]/40 bg-[var(--kura-coral)]/10 px-4 py-3.5 text-left"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-coral)]">
              Action needed
            </span>
            <span className="text-[14px] font-bold text-[var(--kura-text)]">
              Upload ID front & back
            </span>
          </span>
          <span className="text-[12px] font-semibold text-[var(--kura-muted)]">
            Open →
          </span>
        </button>
      ) : needsIdentity ? (
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('kura_account_open', 'identity')
            onNavigateTab('account')
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--kura-amber)]/40 bg-[var(--kura-amber)]/10 px-4 py-3.5 text-left"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-amber)]">
              Action needed
            </span>
            <span className="text-[14px] font-bold text-[var(--kura-text)]">
              {session.kycStatus === 'REJECTED'
                ? 'Resubmit your ID'
                : 'Verify your identity'}
            </span>
          </span>
          <span className="text-[12px] font-semibold text-[var(--kura-muted)]">
            Account →
          </span>
        </button>
      ) : null}

      <RecentActivityList
        items={activityItems}
        loading={activityLoading}
        onSeeAll={onSeeHistory ?? (() => onNavigateTab('wallet'))}
        onOpenReceipt={onOpenReceipt}
      />
    </div>
  )
}
