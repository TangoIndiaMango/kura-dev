import { useEffect, useMemo, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '../../../lib/api/auth'
import { useAuth } from '../../auth/AuthProvider'
import type {
  BookingPaymentMode,
  OperatorActiveReservation,
} from '../../../shared/session'
import {
  cacheHoldForOffline,
  clearOfflineHold,
} from '../../../shared/pwa/holdIdb'
import { nowMs } from '../../../shared/time/serverClock'
import {
  useCancelReservation,
  useCreateReservation,
  useDiscoverHubs,
  useHoldPolicy,
  useMyReservations,
  useMyVehicles,
  type ReservationApi,
} from './use-swap-live'
import {
  apiPaymentMode,
  mapDiscoverHubs,
  mapLiveVehicles,
  uiPaymentMode,
  type BookableHub,
} from '../swapLiveMap'
import { useMySubscriptions } from '../../plans/hooks/use-operator-plans'
import { planLabelForVehicle } from '../../plans/hooks/plan-live-map'
import { useOperatorGeolocation } from './use-operator-geolocation'

function toHold(row: ReservationApi): OperatorActiveReservation {
  return {
    id: row.id,
    code: row.code,
    hubId: row.hub,
    hubName: row.hub_name,
    vehicleId: row.vehicle,
    vehicleLabel: row.vehicle_plate,
    expiresAt: new Date(row.expires_at).getTime(),
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : nowMs(),
    paymentMode: uiPaymentMode(row.payment_mode),
    ...(row.qr ? { qr: row.qr } : {}),
  }
}

async function persistHoldOffline(hold: OperatorActiveReservation): Promise<void> {
  if (!hold.qr) return
  await cacheHoldForOffline({
    id: hold.id,
    code: hold.code,
    hubId: hold.hubId,
    hubName: hold.hubName,
    vehicleLabel: hold.vehicleLabel,
    expiresAt: hold.expiresAt,
    paymentMode: hold.paymentMode,
    qr: hold.qr,
  })
}

export function useLiveSwapBooking() {
  const { isAuthenticated } = useAuth()
  const { position } = useOperatorGeolocation(isAuthenticated)
  const vehiclesQuery = useMyVehicles({
    enabled: isAuthenticated,
    pageSize: 100,
  })
  const subsQuery = useMySubscriptions({ enabled: isAuthenticated })
  const primaryVehicleId = vehiclesQuery.vehicles[0]?.id
  const discover = useDiscoverHubs({
    enabled: isAuthenticated,
    vehicleId: primaryVehicleId,
    lat: position?.lat,
    lng: position?.lng,
    openNow: true,
  })
  const holdPolicy = useHoldPolicy({ enabled: isAuthenticated })
  const liveReservationsQuery = useMyReservations({
    enabled: isAuthenticated,
    status: 'CONFIRMED',
  })
  const createReservation = useCreateReservation()
  const cancelReservation = useCancelReservation()
  const [bookingBusy, setBookingBusy] = useState(false)

  const holdMinutes = holdPolicy.defaultHoldMinutes

  const vehicles = useMemo(() => {
    if (!isAuthenticated) return []
    return mapLiveVehicles(vehiclesQuery.vehicles).map((v) => ({
      ...v,
      plan: planLabelForVehicle(subsQuery.subscriptions, v.id),
    }))
  }, [isAuthenticated, vehiclesQuery.vehicles, subsQuery.subscriptions])

  const catalogueHubs: BookableHub[] = useMemo(
    () =>
      isAuthenticated && discover.hubs.length > 0
        ? mapDiscoverHubs(discover.hubs, position)
        : [],
    [isAuthenticated, discover.hubs, position],
  )

  // Keep time-expired CONFIRMED rows until the server flips status — pass UI needs
  // the rebook state instead of vanishing on list refetch.
  const holds = useMemo(
    () =>
      liveReservationsQuery.reservations
        .filter((r) => r.status === 'CONFIRMED' || r.status === 'PENDING')
        .map(toHold),
    [liveReservationsQuery.reservations, liveReservationsQuery.dataUpdatedAt],
  )

  useEffect(() => {
    for (const hold of holds) {
      if (hold.expiresAt <= nowMs()) continue
      persistHoldOffline(hold).catch(() => undefined)
    }
  }, [holds])

  async function createHold(input: {
    hub: BookableHub
    vehicle: { id: string; short: string }
    mode: BookingPaymentMode
  }): Promise<{
    id: string
    code: string
    expiresAt: number
    qr: string
  } | null> {
    if (bookingBusy) return null
    if (!isAuthenticated) {
      notifications.show({
        color: 'red',
        message: 'Sign in to book a swap',
      })
      return null
    }
    setBookingBusy(true)
    try {
      const res = await createReservation.mutateAsync({
        vehicle: input.vehicle.id,
        hub: input.hub.id,
        payment_mode: apiPaymentMode(input.mode),
      })
      const qr = (res.qr ?? '').trim()
      if (!qr) {
        notifications.show({
          color: 'red',
          message: 'Hold booked, but QR token is missing — use the code at the hub',
        })
      }
      const created = {
        id: res.id,
        code: res.code,
        expiresAt: new Date(res.expires_at).getTime(),
        qr,
      }
      if (qr) {
        await cacheHoldForOffline({
          id: created.id,
          code: created.code,
          hubId: input.hub.id,
          hubName: input.hub.name,
          vehicleLabel: input.vehicle.short,
          expiresAt: created.expiresAt,
          paymentMode: input.mode,
          qr,
        })
      }
      return created
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not create reservation'),
      })
      return null
    } finally {
      setBookingBusy(false)
    }
  }

  async function cancelHold(reservationId: string): Promise<boolean> {
    if (!isAuthenticated) return false
    try {
      await cancelReservation.mutateAsync({ id: reservationId })
      await clearOfflineHold(reservationId)
      return true
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not cancel reservation'),
      })
      return false
    }
  }

  return {
    isAuthenticated,
    vehicles,
    catalogueHubs,
    holds,
    userPosition: position,
    bookingBusy,
    holdMinutes,
    hubsLoading: isAuthenticated && discover.isLoading,
    vehiclesLoading: isAuthenticated && vehiclesQuery.isLoading,
    holdsLoading: isAuthenticated && liveReservationsQuery.isLoading,
    cancelBusy: cancelReservation.isPending,
    createHold,
    cancelHold,
  }
}
