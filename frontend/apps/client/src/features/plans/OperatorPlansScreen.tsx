import React, { useEffect, useMemo, useState } from 'react'
import type { TabId } from '../layout/FloatingGlassBottomBar'
import { useOperatorSession } from '../../shared/session'
import { useAuth } from '../auth/AuthProvider'
import { KuraIllustrationModal } from '../../shared/components'
import { OperatorBannerEmptyState } from '../../shared/components/operator/OperatorBannerEmptyState'
import { CurrentPlanCard } from './components/CurrentPlanCard'
import { PlanOptionsList } from './components/PlanOptionsList'
import { VehiclePlanPicker, isPayPerSwap } from './components/VehiclePlanPicker'
import { VehiclesPickerSheet } from './components/VehiclesPickerSheet'
import { ComparePlansSheet } from './components/ComparePlansSheet'
import { PlanChangeConfirmSheet } from './components/PlanChangeConfirmSheet'
import { getChangeKind, type PlanChangeKind } from './planCatalog'
import {
  useCataloguePlans,
  useMySubscriptions,
} from './hooks/use-operator-plans'
import { useLivePlanActions } from './hooks/use-live-plan-actions'
import {
  catalogFromApiPlans,
  coveringSubscription,
  subscriptionToCard,
} from './hooks/plan-live-map'
import { usePlanVehicles } from './hooks/use-plan-vehicles'

interface OperatorPlansScreenProps {
  onNavigateTab: (tab: TabId) => void
}

function successTitle(kind: PlanChangeKind): string | undefined {
  if (kind === 'upgrade') return 'Plan upgraded'
  if (kind === 'downgrade') return 'Plan change queued'
  if (kind === 'subscribe') return 'Plan started'
  return undefined
}

function vehicleTypeLabel(raw: string | null | undefined): string {
  const t = (raw || '').toUpperCase()
  if (t === 'BOAT') return 'boat'
  if (t === 'TRICYCLE') return 'tricycle'
  if (t === 'MOTORCYCLE') return 'motorcycle'
  return 'this vehicle type'
}

export const OperatorPlansScreen: React.FC<OperatorPlansScreenProps> = ({
  onNavigateTab,
}) => {
  const { session } = useOperatorSession()
  const { isAuthenticated } = useAuth()
  const live = Boolean(isAuthenticated)

  const { subscriptions, isPending: subsLoading } = useMySubscriptions({
    enabled: live,
  })
  const { plans: cataloguePlans, isPending: catalogueLoading } =
    useCataloguePlans({ enabled: live })
  const { vehicles, liveApiVehicles, loading: vehiclesLoading } = usePlanVehicles({
    live,
    sessionVehicles: [],
    subscriptions,
  })

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [vehiclesOpen, setVehiclesOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successKind, setSuccessKind] = useState<PlanChangeKind>('renew')

  useEffect(() => {
    if (!vehicles.some((v) => v.id === vehicleId)) {
      setVehicleId(vehicles[0]?.id ?? '')
    }
  }, [vehicles, vehicleId])

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null
  const vehicleLabel = [vehicle?.name, vehicle?.short, vehicle?.battery, vehicle?.reg]
    .filter(Boolean)
    .join(' ')

  const selectedVehicleType =
    liveApiVehicles.find((v) => v.id === vehicle?.id)?.vehicle_type ?? null

  const liveSub = useMemo(() => {
    if (!live || !vehicle) return null
    return coveringSubscription(subscriptions, vehicle.id)
  }, [live, vehicle, subscriptions])

  const liveCard = liveSub ? subscriptionToCard(liveSub) : null

  const vehicleCatalog = useMemo(() => {
    if (!live || !vehicle) return []
    const typeHint = selectedVehicleType || vehicleLabel
    return catalogFromApiPlans(cataloguePlans, typeHint)
  }, [live, vehicle, cataloguePlans, selectedVehicleType, vehicleLabel])

  const catalogueReady = !live || !catalogueLoading
  const noPlansForType =
    live && catalogueReady && Boolean(vehicle) && vehicleCatalog.length === 0

  const currentOptionId = liveCard?.optionId ?? null

  const actions = useLivePlanActions({
    live,
    vehicleId: vehicle?.id ?? null,
    vehicleName: vehicle?.short ?? vehicle?.name ?? 'vehicle',
    liveSub,
    catalog: vehicleCatalog,
    onSuccess: (kind) => {
      setSuccessKind(kind)
      setSuccessOpen(true)
    },
  })

  const target =
    actions.target ??
    (actions.pending
      ? vehicleCatalog.find((p) => p.id === actions.pending!.optionId) ?? null
      : null)

  if (!session) return null

  if (vehiclesLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Plans</h2>
        <div className="h-[88px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
        <div className="h-[120px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
        <div className="h-[160px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Plans</h2>
        <OperatorBannerEmptyState
          image="/illustrations/plans-empty-bay.png"
          title="Add a vehicle to pick a plan"
          description="Every plan is tied to one vehicle, so we need to know what you ride before we can price it."
          actionLabel="Add vehicle"
          onAction={() => {
            sessionStorage.setItem('kura_swap_intent', 'book')
            onNavigateTab('swap')
          }}
          footnote="No plan yet? You can still pay per swap at any hub."
        />
      </div>
    )
  }

  const cardStatus = liveCard?.status ?? 'Active'
  const payPerSwap = live
    ? !liveCard || liveCard.optionId === 'pps'
    : isPayPerSwap(null, vehicle)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Plans</h2>
        <button
          type="button"
          disabled={vehicleCatalog.length === 0}
          onClick={() => setCompareOpen(true)}
          className="text-[13px] font-bold text-[var(--kura-teal-bright)] disabled:opacity-40"
        >
          Compare
        </button>
      </div>

      {live && subsLoading ? (
        <div className="h-28 animate-pulse rounded-2xl bg-[var(--kura-bg-elevated)]" />
      ) : (
        <div className="flex flex-col gap-3">
          <VehiclePlanPicker
            vehicles={vehicles}
            plans={[]}
            activeVehicleId={vehicleId}
            onOpenSwitcher={() => setVehiclesOpen(true)}
          />
          <CurrentPlanCard
            payPerSwap={payPerSwap}
            payPerSwapNaira={
              vehicleCatalog.find((p) => p.id === 'pps')?.priceNaira
            }
            name={liveCard?.name || vehicle?.plan || 'Plan'}
            status={cardStatus}
            expires={liveCard?.expiresLabel ?? ''}
            daysLeft={liveCard?.progressLabel ?? ''}
            autoRenew={liveCard?.autoRenew ?? false}
            showRenew={
              Boolean(liveCard) &&
              !payPerSwap &&
              (cardStatus === 'Expiring' || cardStatus === 'Expired')
            }
            onRenew={() => {
              if (currentOptionId && currentOptionId !== 'pps') {
                actions.openPending(currentOptionId, 'renew')
              }
            }}
          />
        </div>
      )}

      {live && catalogueLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--kura-bg-elevated)]" />
      ) : noPlansForType ? (
        <div className="rounded-2xl border border-dashed border-[var(--kura-border)] px-4 py-6 text-center">
          <p className="text-[14px] font-bold text-[var(--kura-text)]">
            No plans for {vehicleTypeLabel(selectedVehicleType)}
          </p>
          <p className="mt-1.5 text-[13px] text-[var(--kura-muted)]">
            This vehicle type has no active catalogue yet. Switch to another
            vehicle if you have one with plans available.
          </p>
          {vehicles.length > 1 ? (
            <button
              type="button"
              onClick={() => setVehiclesOpen(true)}
              className="mt-4 text-[13px] font-bold text-[var(--kura-teal-bright)]"
            >
              Switch vehicle
            </button>
          ) : null}
        </div>
      ) : (
        <PlanOptionsList
          options={vehicleCatalog}
          currentOptionId={currentOptionId}
          status={cardStatus}
          onSelect={(optionId, kind) => actions.openPending(optionId, kind)}
        />
      )}

      <VehiclesPickerSheet
        opened={vehiclesOpen}
        vehicles={vehicles}
        plans={[]}
        activeVehicleId={vehicleId}
        onClose={() => setVehiclesOpen(false)}
        onSelect={setVehicleId}
      />

      <ComparePlansSheet
        opened={compareOpen && vehicleCatalog.length > 0}
        currentOptionId={currentOptionId}
        catalog={vehicleCatalog}
        onClose={() => setCompareOpen(false)}
        onChoose={(optionId) => {
          actions.openPending(
            optionId,
            getChangeKind({
              currentOptionId,
              targetOptionId: optionId,
              status: cardStatus,
            }),
          )
        }}
      />

      {actions.pending && target ? (
        <PlanChangeConfirmSheet
          opened
          kind={actions.pending.kind}
          target={target}
          vehicleLabel={vehicle?.short ?? vehicle?.name ?? 'vehicle'}
          vehicleCount={vehicles.length}
          previewMessage={actions.preview?.message}
          previewDueNaira={
            actions.preview != null
              ? Math.round(actions.preview.due_kobo / 100)
              : null
          }
          previewListNaira={
            actions.preview != null
              ? Math.round(actions.preview.target_list_kobo / 100)
              : null
          }
          pinRequired={
            live &&
            (Boolean(actions.preview?.pin_required) ||
              actions.pending.kind === 'subscribe' ||
              actions.pending.kind === 'renew' ||
              actions.pending.kind === 'upgrade')
          }
          busy={actions.busy}
          error={actions.sheetError}
          onClose={actions.clearSheet}
          onConfirm={actions.onConfirm}
        />
      ) : null}

      <KuraIllustrationModal
        opened={successOpen}
        onClose={() => setSuccessOpen(false)}
        illustrationId="plan-renewed"
        title={successTitle(successKind)}
        primaryAction={{
          label: 'Back to home',
          onClick: () => {
            setSuccessOpen(false)
            onNavigateTab('home')
          },
        }}
      />
    </div>
  )
}
