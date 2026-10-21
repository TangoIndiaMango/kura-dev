import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '../../../lib/api/client'
import { useFetchData } from '../../../shared/hooks/api'

export type FleetDriverRow = {
  id: string
  phone?: string | null
  first_name?: string
  last_name?: string
  status: string
  daily_swap_limit?: number | null
  daily_spend_kobo_limit?: number | null
}

type DriversPage = { results: FleetDriverRow[]; count?: number }

export function useFleetDrivers(accountId: string | undefined, enabled = true) {
  const key = ['/drivers/', { account: accountId, page_size: 50 }] as const
  const query = useFetchData<DriversPage>(
    '/drivers/',
    { account: accountId ?? '', page_size: 50 },
    { enabled: Boolean(accountId) && enabled, staleTime: 30_000 },
  )
  return {
    ...query,
    drivers: query.data?.results ?? [],
    queryKey: key,
  }
}

export function useAttachFleetDriver(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      phone: string
      first_name?: string
      last_name?: string
      daily_swap_limit?: number | null
      daily_spend_kobo_limit?: number | null
    }) => {
      const { data } = await axiosInstance.post('/drivers/attach/', {
        account_id: accountId,
        ...payload,
      })
      return data as FleetDriverRow
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/drivers/'] })
    },
  })
}

export function useAssignVehicleDriver(vehicleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (driverId: string | null) => {
      const { data } = await axiosInstance.post(
        `/mobility/vehicles/${vehicleId}/assign-driver/`,
        { driver_id: driverId },
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/mobility/vehicles/'] })
    },
  })
}

/** Owner sets soft daily caps — null clears a cap (unrestricted). */
export function useUpdateDriverLimits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      driverId: string
      daily_swap_limit: number | null
      daily_spend_kobo_limit: number | null
    }) => {
      const { data } = await axiosInstance.patch(`/drivers/${v.driverId}/`, {
        daily_swap_limit: v.daily_swap_limit,
        daily_spend_kobo_limit: v.daily_spend_kobo_limit,
      })
      return data as FleetDriverRow
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/drivers/'] })
      qc.invalidateQueries({ queryKey: ['/accounts/me/fleet-spend/'] })
    },
  })
}
