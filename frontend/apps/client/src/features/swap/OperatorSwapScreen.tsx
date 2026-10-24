import React, { useEffect, useMemo, useState } from 'react'
import type { TabId } from '../layout/FloatingGlassBottomBar'
import {
  useOperatorSession,
  vehicleCoveredByPlan,
  type BookingPaymentMode,
  type OperatorActiveReservation,
} from '../../shared/session'
import { tariffFor } from '../../shared/tariffs/vehicleTariffs'
import type { DiscountRedeemOk } from '../../shared/utils/discountRedeem'
import { KuraIllustrationModal } from '../../shared/components'
import { apiErrorMessage } from '../../lib/api/auth'
import {
  useSetPinMutation,
  useVerifyPinMutation,
} from '@lib/api/auth-mutations'
import { useAuth } from '../auth/AuthProvider'
import { useLiveSwapBooking } from './hooks/use-live-swap-booking'
import { useCreditEligibility, useOperatorLoans } from '@features/wallet'
import { clearOfflineHold } from '../../shared/pwa/holdIdb'
import { nowMs } from '../../shared/time/serverClock'
import { SwapHubScreen, type SwapRecentItem } from './components/SwapHubScreen'
import { mapSwapToRecentItem } from './swapRecentMap'
import { SelectVehicleStep } from './components/SelectVehicleStep'
import { AddVehicleStep } from './components/AddVehicleStep'
import { FindHubStep } from './components/FindHubStep'
import { partitionSwapHubs } from './hubAvailability'
import { HubDetailStep } from './components/HubDetailStep'
import { ConfirmReserveStep } from './components/ConfirmReserveStep'
import { PinStep } from './components/PinStep'
import { SetPinStep } from './components/SetPinStep'
import { ForgotPinFlow } from './components/ForgotPinFlow'
import { ReservationCodeStep } from './components/ReservationCodeStep'
import { useSwapPayment } from './hooks/use-swap-payment'
import { useBookingPrecheck, useMySwaps } from './hooks/use-swap-live'
import { swapsPausedMessage } from '../../shared/session/accountStatus'

type View = 'hub' | 'book' | 'pass'
type BookStep =
  | 'add-vehicle'
  | 'vehicle'
  | 'find-hub'
  | 'hub-detail'
  | 'confirm'
  | 'set-pin'
  | 'pin'
  | 'forgot-pin'

interface OperatorSwapScreenProps {
  onNavigateTab: (tab: TabId) => void
  onSeeHistory?: () => void
  onOpenReceipt?: (receiptId: string) => void
}

const emptyPin = () => ['', '', '', '']

function readSwapIntent(): { view: View; passId?: string } {
  const raw = sessionStorage.getItem('kura_swap_intent')
  sessionStorage.removeItem('kura_swap_intent')
  if (!raw) return { view: 'hub' }
  if (raw === 'book') return { view: 'book' }
  if (raw.startsWith('pass:')) return { view: 'pass', passId: raw.slice(5) }
  return { view: 'hub' }
}

export const OperatorSwapScreen: React.FC<OperatorSwapScreenProps> = ({
  onNavigateTab,
  onSeeHistory,
  onOpenReceipt,
}) => {
  const { session } = useOperatorSession()
  const { refreshProfile } = useAuth()
  const creditEligibility = useCreditEligibility({
    enabled: Boolean(session),
  })
  const creditLoans = useOperatorLoans({
    enabled:
      Boolean(session) &&
      Boolean(creditEligibility.eligibility?.credit_enabled),
  })
  const {
    isAuthenticated,
    vehicles,
    catalogueHubs,
    holds: bookingHolds,
    userPosition,
    bookingBusy,
    holdMinutes,
    hubsLoading,
    vehiclesLoading,
    holdsLoading,
    cancelBusy,
    createHold,
    cancelHold,
  } = useLiveSwapBooking()
  const verifyPin = useVerifyPinMutation()
  const setPinMut = useSetPinMutation()

  const liveSwaps = useMySwaps({ enabled: isAuthenticated, page_size: 8 })
  const bookingPrecheck = useBookingPrecheck(isAuthenticated)
  const [localHold, setLocalHold] = useState<OperatorActiveReservation | null>(null)
  const [pinnedHold, setPinnedHold] = useState<OperatorActiveReservation | null>(
    null,
  )
  const holds = useMemo(() => {
    if (!localHold) return bookingHolds
    if (bookingHolds.some((h) => h.id === localHold.id)) return bookingHolds
    return [localHold, ...bookingHolds]
  }, [bookingHolds, localHold])

  const mapOrigin = userPosition

  const recentSwaps = useMemo(
    () => liveSwaps.swaps.map(mapSwapToRecentItem),
    [liveSwaps.swaps],
  )
  const [inProgressSwap, setInProgressSwap] = useState<SwapRecentItem | null>(
    null,
  )
  const swapPayment = useSwapPayment(() => setInProgressSwap(null))
  const inProgressPaystack =
    inProgressSwap?.paymentMode?.toUpperCase() === 'PAYSTACK'
  const [incompleteSwap, setIncompleteSwap] = useState<SwapRecentItem | null>(
    null,
  )

  const intent = useMemo(() => readSwapIntent(), [])
  const [view, setView] = useState<View>(() => intent.view)
  const [passId, setPassId] = useState<string | null>(
    () => intent.passId ?? holds[0]?.id ?? null,
  )
  const [bookStep, setBookStep] = useState<BookStep>('vehicle')
  const [vehicleId, setVehicleId] = useState<string | null>(vehicles[0]?.id ?? null)
  const [hubId, setHubId] = useState<string | null>(null)
  const [pin, setPin] = useState(emptyPin())
  const [confirmPin, setConfirmPin] = useState(emptyPin())
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinAttemptsLeft, setPinAttemptsLeft] = useState(3)
  const [reservedOpen, setReservedOpen] = useState(false)
  const [findingOpen, setFindingOpen] = useState(false)
  const [swapProgressOpen, setSwapProgressOpen] = useState(false)
  const [countdownOpen, setCountdownOpen] = useState(false)
  const [paymentMode, setPaymentMode] = useState<BookingPaymentMode>('PAYSTACK')
  const [pendingDueNaira, setPendingDueNaira] = useState(450)
  const [pendingDiscountCode, setPendingDiscountCode] = useState('')

  useEffect(() => {
    if (vehiclesLoading) return
    if (vehicles.length === 0) {
      setView('book')
      setBookStep('add-vehicle')
      setVehicleId(null)
      return
    }
    setVehicleId((prev) =>
      prev && vehicles.some((v) => v.id === prev) ? prev : vehicles[0].id,
    )
    setBookStep((s) => (s === 'add-vehicle' ? 'vehicle' : s))
  }, [vehicles, vehiclesLoading])

  // Never leave a vehicle with an overdue pack selected for booking.
  useEffect(() => {
    const blocked = bookingPrecheck.blockedByVehicle
    if (!vehicleId || !blocked.has(vehicleId)) return
    const next = vehicles.find((v) => !blocked.has(v.id))
    if (next) setVehicleId(next.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blockedByVehicle is rebuilt from data each render
  }, [bookingPrecheck.data, vehicleId, vehicles])

  useEffect(() => {
    if (intent.view !== 'pass' || !intent.passId) return
    setPassId(intent.passId)
    setView('pass')
  }, [intent.view, intent.passId])

  useEffect(() => {
    if (!passId) return
    const match = holds.find((h) => h.id === passId)
    if (match) setPinnedHold(match)
  }, [holds, passId])

  if (!session) return null

  const hubBootstrapping =
    vehiclesLoading ||
    (holdsLoading && holds.length === 0) ||
    (liveSwaps.isLoading && recentSwaps.length === 0)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const hub = catalogueHubs.find((h) => h.id === hubId)
  const listPriceNaira =
    vehicle?.payPerSwapNaira ??
    tariffFor(
      [vehicle?.name, vehicle?.short, vehicle?.battery, vehicle?.reg]
        .filter(Boolean)
        .join(' '),
    ).payPerSwap
  const covered = vehicle ? vehicleCoveredByPlan(vehicle.plan) : false
  const activeLoan = creditLoans.activeLoan
  const creditAvailable = Boolean(
    activeLoan && activeLoan.swap_credit_remaining_kobo > 0,
  )
  const creditEligibleBand = Boolean(
    creditEligibility.eligibility?.eligible &&
      creditEligibility.eligibility?.credit_enabled,
  )
  const effectiveMode: BookingPaymentMode = covered ? 'PLAN' : paymentMode
  const paymentLabel =
    effectiveMode === 'PLAN'
      ? `Included · ${vehicle?.plan} plan`
      : effectiveMode === 'PAYSTACK'
        ? `₦${listPriceNaira.toLocaleString()} · Paystack at the bay`
        : effectiveMode === 'CASH_AT_HUB'
        ? `₦${listPriceNaira.toLocaleString()} · cash at hub`
        : effectiveMode === 'CREDIT'
          ? `₦${listPriceNaira.toLocaleString()} · credit`
          : `₦${listPriceNaira.toLocaleString()} · paid online`

  const vehiclesAvailableToBook = vehicles.filter(
    (v) => !holds.some((h) => h.vehicleId === v.id),
  )

  const startBook = () => {
    void bookingPrecheck.refetch()
    if (vehicles.length === 0) {
      setBookStep('add-vehicle')
    } else {
      const first = vehiclesAvailableToBook[0] ?? vehicles[0]
      setVehicleId(first?.id ?? null)
      setBookStep('vehicle')
    }
    setHubId(null)
    setView('book')
  }

  const startFindingHubs = () => {
    setFindingOpen(true)
    window.setTimeout(() => {
      setFindingOpen(false)
      setBookStep('find-hub')
    }, 2200)
  }

  // Pay-per-swap defaults to Paystack at the bay.
  const goToConfirm = () => {
    if (!covered) setPaymentMode('PAYSTACK')
    setBookStep('confirm')
  }

  const afterConfirm = (dueNaira: number, discount: DiscountRedeemOk | null) => {
    setPendingDueNaira(dueNaira)
    setPendingDiscountCode(discount?.code ?? '')
    if (!session.hasPin) {
      setPin(emptyPin())
      setConfirmPin(emptyPin())
      setBookStep('set-pin')
      return
    }
    setPin(emptyPin())
    setPinError(null)
    setPinAttemptsLeft(3)
    setBookStep('pin')
  }

  const completeReservation = (modeOverride?: BookingPaymentMode) => {
    const mode = modeOverride ?? effectiveMode
    if (!(hub && vehicle) || bookingBusy) return

    createHold({ hub, vehicle, mode, discountCode: pendingDiscountCode }).then((created) => {
      if (!created) return
      const hold: OperatorActiveReservation = {
        id: created.id,
        code: created.code,
        hubId: hub.id,
        hubName: hub.name,
        vehicleId: vehicle.id,
        vehicleLabel: vehicle.short,
        expiresAt: created.expiresAt,
        createdAt: Date.now(),
        paymentMode: mode,
        ...(created.qr ? { qr: created.qr } : {}),
        dueNaira: created.dueNaira ?? pendingDueNaira,
      }
      setLocalHold(hold)
      setPinnedHold(hold)
      setPassId(created.id)
      setSwapProgressOpen(true)
      window.setTimeout(() => {
        setSwapProgressOpen(false)
        setReservedOpen(true)
      }, 2000)
    })
  }

  const openPass = (id: string) => {
    const match = holds.find((h) => h.id === id)
    if (match) setPinnedHold(match)
    setPassId(id)
    setView('pass')
  }

  const clearPinned = () => {
    setPinnedHold(null)
    setLocalHold(null)
  }

  const findingModal = (
    <KuraIllustrationModal
      opened={findingOpen}
      onClose={() => {
        setFindingOpen(false)
        setBookStep('find-hub')
      }}
      illustrationId="finding-hubs"
      primaryAction={{
        label: 'Cancel',
        onClick: () => {
          setFindingOpen(false)
          setBookStep('find-hub')
        },
      }}
    />
  )

  const reservationModals = (
    <>
      <KuraIllustrationModal
        opened={Boolean(incompleteSwap)}
        onClose={() => setIncompleteSwap(null)}
        illustrationId={
          incompleteSwap?.uiStatus === 'FAILED'
            ? 'payment-declined'
            : 'reservation-expired'
        }
        title={
          incompleteSwap?.uiStatus === 'FAILED'
            ? 'Swap not completed'
            : 'Hold expired'
        }
        description={
          incompleteSwap
            ? incompleteSwap.uiStatus === 'FAILED'
              ? `${incompleteSwap.title} was closed without finishing at the bay. No fee was charged. Book again when you are ready.`
              : `${incompleteSwap.title} never finished at the bay before the reservation timer ended. No fee was charged. Book again when you are ready.`
            : undefined
        }
        primaryAction={{
          label: 'Book again',
          onClick: () => {
            setIncompleteSwap(null)
            startBook()
          },
        }}
        secondaryAction={{
          label: 'Dismiss',
          onClick: () => setIncompleteSwap(null),
        }}
      />
      <KuraIllustrationModal
        opened={Boolean(inProgressSwap)}
        onClose={() => setInProgressSwap(null)}
        illustrationId="swap-in-progress"
        title="Swap in progress"
        description={
          inProgressSwap
            ? inProgressPaystack
              ? `${inProgressSwap.title} · ${inProgressSwap.amountLabel}. Pay with Paystack (card, bank transfer or USSD) — the hub completes your swap once it's confirmed.`
              : `${inProgressSwap.title} · ${inProgressSwap.amountLabel}. Pay-as-you-go settles when the hub agent finishes the swap — then your receipt appears here.`
            : undefined
        }
        primaryAction={
          inProgressPaystack && inProgressSwap
            ? {
                label: swapPayment.busy
                  ? 'Opening Paystack…'
                  : inProgressSwap.amountLabel.startsWith('₦')
                    ? `Pay ${inProgressSwap.amountLabel}`
                    : 'Pay now',
                loading: swapPayment.busy,
                onClick: () => void swapPayment.pay(inProgressSwap.id),
              }
            : { label: 'Got it', onClick: () => setInProgressSwap(null) }
        }
        secondaryAction={
          inProgressPaystack ? { label: 'Later', onClick: () => setInProgressSwap(null) } : undefined
        }
      />
      <KuraIllustrationModal
        opened={swapProgressOpen}
        onClose={() => {}}
        illustrationId="swap-in-progress"
        closeOnClickOutside={false}
        primaryAction={{ label: 'Contact agent', onClick: () => {} }}
      />
      <KuraIllustrationModal
        opened={reservedOpen}
        onClose={() => setReservedOpen(false)}
        illustrationId="battery-reserved"
        description="Your battery is held. Show the QR at the hub before the timer ends."
        primaryAction={{
          label: 'Show code',
          onClick: () => {
            setReservedOpen(false)
            setCountdownOpen(true)
            window.setTimeout(() => {
              setCountdownOpen(false)
              setView('pass')
            }, 1400)
          },
        }}
      />
      <KuraIllustrationModal
        opened={countdownOpen}
        onClose={() => {
          setCountdownOpen(false)
          setView('pass')
        }}
        illustrationId="reservation-countdown"
        description={`${holdMinutes} min hold — open your QR when you arrive.`}
        closeOnClickOutside={false}
        primaryAction={{
          label: 'Show code',
          onClick: () => {
            setCountdownOpen(false)
            setView('pass')
          },
        }}
      />
    </>
  )

  if (view === 'hub') {
    return (
      <>
        <SwapHubScreen
          holds={holds}
          recentSwaps={recentSwaps}
          loading={hubBootstrapping}
          onOpenHold={openPass}
          onNewSwap={startBook}
          onSeeHistory={onSeeHistory}
          onOpenReceipt={onOpenReceipt}
          onOpenInProgressSwap={setInProgressSwap}
          onOpenIncompleteSwap={setIncompleteSwap}
        />
        {reservationModals}
      </>
    )
  }

  if (view === 'pass') {
    const hold =
      holds.find((h) => h.id === passId) ??
      (pinnedHold?.id === passId ? pinnedHold : null) ??
      holds[0]
    if (!hold) {
      if (holdsLoading) {
        return (
          <div className="flex flex-col gap-3 py-8">
            <div className="mx-auto h-4 w-40 animate-pulse rounded bg-[var(--kura-border)]" />
            <div className="mx-auto h-48 w-48 animate-pulse rounded-2xl bg-[var(--kura-border)]" />
          </div>
        )
      }
      return (
        <>
          <SwapHubScreen
            holds={holds}
            recentSwaps={recentSwaps}
            loading={hubBootstrapping}
            onOpenHold={openPass}
            onNewSwap={startBook}
            onSeeHistory={onSeeHistory}
            onOpenReceipt={onOpenReceipt}
            onOpenInProgressSwap={setInProgressSwap}
            onOpenIncompleteSwap={setIncompleteSwap}
          />
          {reservationModals}
        </>
      )
    }
    return (
      <ReservationCodeStep
        code={hold.code}
        hubName={hold.hubName}
        holdMinutes={holdMinutes}
        expiresAtMs={hold.expiresAt}
        qrPayload={hold.qr}
        paymentHint={
          hold.paymentMode === 'PAYSTACK'
            ? 'Pay with Paystack at the bay when you swap'
            : hold.paymentMode === 'CASH_AT_HUB'
            ? 'Pay cash at the bay when you swap'
            : hold.paymentMode === 'PLAN'
              ? 'Covered by your plan'
              : 'Paid online'
        }
        cancelBusy={cancelBusy}
        onDone={() => {
          clearPinned()
          setView('hub')
        }}
        onCancel={() => {
          cancelHold(hold.id).then((ok) => {
            if (!ok) return
            clearPinned()
            setView('hub')
          })
        }}
        onRebook={() => {
          const go = () => {
            clearPinned()
            startBook()
          }
          if (hold.expiresAt <= nowMs()) {
            clearOfflineHold(hold.id).catch(() => undefined)
            go()
            return
          }
          cancelHold(hold.id).then((ok) => {
            if (!ok) return
            go()
          })
        }}
        onBookAnotherVehicle={
          vehiclesAvailableToBook.length > 0 ? () => startBook() : undefined
        }
      />
    )
  }

  if (bookStep === 'add-vehicle') {
    return (
      <>
        <AddVehicleStep
          onAdded={(added) => {
            setVehicleId(added.id)
            startFindingHubs()
          }}
        />
        {findingModal}
      </>
    )
  }

  const blockedVehicles = bookingPrecheck.blockedByVehicle
  const bookable = vehicles.filter((v) => !blockedVehicles.has(v.id))
  // Every vehicle has an overdue pack: say so instead of a list of disabled cards.
  const allBlocked =
    vehicles.length > 0 && bookable.length === 0
      ? vehicles.map((v) => blockedVehicles.get(v.id)).join(' ')
      : null
  const swapsPaused =
    swapsPausedMessage(session?.accountStatus) ?? bookingPrecheck.blockedMessage ?? allBlocked
  if (bookStep === 'vehicle' && swapsPaused) {
    return (
      <>
        <button
          type="button"
          onClick={() => setView('hub')}
          className="mb-3 text-[13px] font-semibold text-[var(--kura-muted)]"
        >
          ← All swaps
        </button>
        <div
          role="alert"
          className="rounded-2xl border border-[var(--kura-coral)]/40 bg-[var(--kura-coral)]/10 px-4 py-3.5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-coral)]">
            Booking paused
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--kura-text)]">{swapsPaused}</p>
        </div>
      </>
    )
  }

  if (bookStep === 'vehicle') {
    const list =
      vehiclesAvailableToBook.length > 0 ? vehiclesAvailableToBook : vehicles
    return (
      <>
        <button
          type="button"
          onClick={() => setView('hub')}
          className="mb-3 text-[13px] font-semibold text-[var(--kura-muted)]"
        >
          ← All swaps
        </button>
        <SelectVehicleStep
          vehicles={list.map((v) => ({
            ...v,
            plan: vehicleCoveredByPlan(v.plan) ? v.plan : 'Pay-per-swap',
            blockedReason: blockedVehicles.get(v.id) ?? null,
          }))}
          selectedId={vehicleId}
          onSelect={setVehicleId}
          onContinue={startFindingHubs}
          loading={vehiclesLoading}
        />
        {findingModal}
      </>
    )
  }

  if (bookStep === 'find-hub') {
    const { bookable, unavailable } = partitionSwapHubs(
      catalogueHubs,
      isAuthenticated ? null : (vehicle?.battery ?? null),
    )
    return (
      <FindHubStep
        hubs={bookable}
        unavailableHubs={unavailable}
        selectedId={hubId}
        vehicleLabel={vehicle?.batteryType || 'your battery type'}
        userPosition={mapOrigin}
        loading={hubsLoading}
        onSelect={(id) => {
          if (!bookable.find((h) => h.id === id)) return
          setHubId(id)
          setBookStep('hub-detail')
        }}
        onOpenDetail={(id) => {
          if (!bookable.find((h) => h.id === id)) return
          setHubId(id)
          setBookStep('hub-detail')
        }}
        onBack={() => setBookStep('vehicle')}
      />
    )
  }

  if (bookStep === 'hub-detail' && hub) {
    return (
      <HubDetailStep
        hub={{
          ...hub,
          status: hub.status === 'offline' ? 'offline' : 'open',
        }}
        userPosition={mapOrigin}
        onBack={() => setBookStep('find-hub')}
        onReserve={goToConfirm}
        onDirections={() => {
          const dest = `destination=${hub.lat},${hub.lng}`
          const origin = mapOrigin
            ? `origin=${mapOrigin.lat},${mapOrigin.lng}&`
            : ''
          window.open(
            `https://www.google.com/maps/dir/?api=1&${origin}${dest}`,
            '_blank',
          )
        }}
      />
    )
  }

  if (bookStep === 'confirm' && vehicle && hub) {
    return (
      <ConfirmReserveStep
        rows={[
          { label: 'Vehicle', value: `${vehicle.short} · ${vehicle.reg}` },
          { label: 'Hub', value: hub.name },
          { label: 'Battery type', value: vehicle.batteryType || '—' },
          { label: 'Payment', value: paymentLabel },
        ]}
        coveredByPlan={covered}
        listPriceNaira={listPriceNaira}
        paymentMode={covered ? 'PLAN' : paymentMode}
        onPaymentModeChange={(mode) => {
          if (mode === 'PLAN') return
          if (mode === 'CREDIT' && !creditAvailable) return
          setPaymentMode(mode)
        }}
        creditAvailable={creditAvailable}
        creditEligible={creditEligibleBand}
        vehicleCount={vehicles.length}
        confirmBusy={bookingBusy}
        onConfirm={afterConfirm}
        onBack={() => setBookStep('hub-detail')}
      />
    )
  }

  if (bookStep === 'set-pin') {
    return (
      <>
        <SetPinStep
          pin={pin}
          onPinChange={setPin}
          confirmPin={confirmPin}
          onConfirmPinChange={setConfirmPin}
          onBack={() => setBookStep('confirm')}
          onSubmit={() => {
            const value = pin.join('')
            setPinMut
              .mutateAsync({ pin: value, pin_confirm: confirmPin.join('') })
              .then(() => refreshProfile())
              .then(() => {
                setPin(emptyPin())
                setConfirmPin(emptyPin())
                completeReservation()
              })
              .catch((err) => {
                setPinError(apiErrorMessage(err, 'Could not set PIN'))
              })
          }}
        />
        {reservationModals}
      </>
    )
  }

  if (bookStep === 'forgot-pin') {
    return (
      <ForgotPinFlow
        phoneDisplay={`+234 ${session.phone}`}
        phone={session.phone}
        onBack={() => {
          setPin(emptyPin())
          setPinError(null)
          setPinAttemptsLeft(3)
          setBookStep('pin')
        }}
        onReset={(newPin) => {
          setPinMut
            .mutateAsync({ pin: newPin, pin_confirm: newPin })
            .then(() => refreshProfile())
            .then(() => {
              setPin(emptyPin())
              setConfirmPin(emptyPin())
              setPinError(null)
              setPinAttemptsLeft(3)
              setBookStep('pin')
            })
            .catch((err) => {
              setPinError(apiErrorMessage(err, 'Could not reset PIN'))
            })
        }}
      />
    )
  }

  if (bookStep === 'pin') {
    const failPin = () => {
      const next = Math.max(0, pinAttemptsLeft - 1)
      setPinAttemptsLeft(next)
      setPinError(next === 0 ? 'Wrong PIN — locked' : 'Wrong PIN')
      setPin(emptyPin())
    }

    return (
      <>
        {!swapProgressOpen && !reservedOpen && !countdownOpen ? (
          <PinStep
            subtitle={
              effectiveMode === 'WALLET'
                ? 'Enter your 4-digit PIN to confirm this booking.'
                : 'Enter your 4-digit PIN to confirm this booking.'
            }
            pin={pin}
            onPinChange={(vals) => {
              if (pinAttemptsLeft <= 0) {
                setPin(emptyPin())
                setPinError('Wrong PIN — locked')
                return
              }
              const filled = vals.filter((d) => d.length === 1).length
              if (pinError && filled > 0 && filled < 4) setPinError(null)
              setPin(vals)
            }}
            onSubmit={() => {
              if (pinAttemptsLeft <= 0) {
                setPinError('Wrong PIN — locked')
                return
              }
              verifyPin
                .mutateAsync({ pin: pin.join('') })
                .then(() => {
                  setPinError(null)
                  setPin(emptyPin())
                  completeReservation()
                })
                .catch(() => failPin())
            }}
            onBack={() => setBookStep('confirm')}
            onForgotPin={() => {
              setPin(emptyPin())
              setPinError(null)
              setBookStep('forgot-pin')
            }}
            error={pinError}
            attemptsLeft={pinAttemptsLeft}
          />
        ) : null}
        {reservationModals}
      </>
    )
  }

  return null
}
