import React, { useEffect, useState } from 'react'
import { FloatingGlassBottomBar, type TabId } from './FloatingGlassBottomBar'
import { OperatorPwaChrome } from './OperatorPwaChrome'
import { OperatorHeader } from './OperatorHeader'
import { OperatorHomeScreen } from '../home/OperatorHomeScreen'
import { OperatorSwapScreen } from '../swap/OperatorSwapScreen'
import { OperatorPlansScreen } from '../plans/OperatorPlansScreen'
import { OperatorWalletScreen } from '../wallet/OperatorWalletScreen'
import { OperatorAccountScreen } from '../account/OperatorAccountScreen'
import { ServiceConsentGate } from '../account/components/ServiceConsentGate'
import { OperatorHistoryScreen } from '../history/OperatorHistoryScreen'
import { OperatorNotificationsScreen } from '../notifications/OperatorNotificationsScreen'
import { OperatorReceiptScreen } from '../receipt/OperatorReceiptScreen'
import { liveReservations, useOperatorSession } from '../../shared/session'
import { nowMs } from '../../shared/time/serverClock'
import { useAuth } from '../auth/AuthProvider'
import { useMyReservations } from '../swap/hooks/use-swap-live'
import { uiPaymentMode } from '../swap/swapLiveMap'
import { useNotificationStats } from '../notifications/hooks/use-notifications'
import { greetingNow } from '../../shared/time/serverClock'

type Overlay =
  | null
  | { type: 'history' }
  | { type: 'notifications' }
  | { type: 'receipt'; receiptId: string; backTo: 'history' | 'home' | 'wallet' }

const SCREENS: Record<
  TabId,
  React.ComponentType<{
    onNavigateTab: (tab: TabId) => void
    onSeeHistory?: () => void
    onOpenReceipt?: (receiptId: string) => void
  }>
> = {
  home: OperatorHomeScreen,
  swap: OperatorSwapScreen,
  wallet: OperatorWalletScreen,
  plans: OperatorPlansScreen,
  account: OperatorAccountScreen,
}

export const OperatorShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [holdJustBooked, setHoldJustBooked] = useState(false)
  const { session, pwaUpdateNotification } = useOperatorSession()
  const { isAuthenticated } = useAuth()
  const notifStats = useNotificationStats({ enabled: isAuthenticated })
  const liveHolds = useMyReservations({
    enabled: isAuthenticated,
    status: 'CONFIRMED',
  })
  const name = session?.name || 'Operator'
  const ActiveScreen = SCREENS[activeTab]
  const localUnread = pwaUpdateNotification?.unread ? 1 : 0
  const unreadCount = (notifStats.data?.totals.unread ?? 0) + localUnread

  const holds = liveReservations(
    liveHolds.reservations
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
      })),
    nowMs(),
  )
  useEffect(() => {
    if (holds.length === 0) return
    setHoldJustBooked(true)
    const t = window.setTimeout(() => setHoldJustBooked(false), 4000)
    return () => window.clearTimeout(t)
  }, [holds.length])

  const openHistory = () => setOverlay({ type: 'history' })
  const openNotifications = () => setOverlay({ type: 'notifications' })
  const openReceipt = (
    receiptId: string,
    backTo: 'history' | 'home' | 'wallet' = 'history',
  ) => setOverlay({ type: 'receipt', receiptId, backTo })
  const closeOverlay = () => setOverlay(null)

  const contentKey = overlay
    ? `${overlay.type}-${'receiptId' in overlay ? overlay.receiptId : ''}`
    : activeTab

  return (
    <div className="flex min-h-screen justify-center bg-[var(--kura-bg)] text-[var(--kura-text)]">
      <div
        className={`relative flex min-h-screen w-full max-w-md flex-col border-x border-[var(--kura-border-subtle)] shadow-2xl ${
          activeTab === 'home' && !overlay
            ? 'kura-shell-home-glow'
            : 'bg-[var(--kura-bg)]'
        }`}
      >
        {activeTab === 'home' && !overlay ? (
          <OperatorHeader
            title={name}
            subtitle={greetingNow()}
            onOpenNotifications={openNotifications}
            showUnreadDot={unreadCount > 0}
          />
        ) : null}

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          <div key={contentKey} className="kura-screen-enter">
            {overlay?.type === 'history' ? (
              <OperatorHistoryScreen
                onBack={closeOverlay}
                onOpenReceipt={(receiptId) => openReceipt(receiptId, 'history')}
              />
            ) : overlay?.type === 'notifications' ? (
              <OperatorNotificationsScreen
                onBack={closeOverlay}
                onOpenIdentity={() => {
                  closeOverlay()
                  setActiveTab('account')
                }}
                onOpenCase={() => {
                  closeOverlay()
                  setActiveTab('account')
                }}
              />
            ) : overlay?.type === 'receipt' ? (
              <OperatorReceiptScreen
                receiptId={overlay.receiptId}
                onBack={() => {
                  if (overlay.backTo === 'history') {
                    setOverlay({ type: 'history' })
                    return
                  }
                  if (overlay.backTo === 'wallet') {
                    setActiveTab('wallet')
                    closeOverlay()
                    return
                  }
                  closeOverlay()
                }}
              />
            ) : (
              <ActiveScreen
                onNavigateTab={setActiveTab}
                onSeeHistory={openHistory}
                onOpenReceipt={(receiptId) =>
                  openReceipt(
                    receiptId,
                    activeTab === 'wallet' ? 'wallet' : 'home',
                  )
                }
              />
            )}
          </div>
        </main>

        {!overlay ? (
          <FloatingGlassBottomBar
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
        ) : null}

        <OperatorPwaChrome holdJustBooked={holdJustBooked} />
        <ServiceConsentGate />
      </div>
    </div>
  )
}
