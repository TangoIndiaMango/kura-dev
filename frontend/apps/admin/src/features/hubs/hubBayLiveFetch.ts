/** Live bay lookups — vehicles, accounts, wallets (no mocks). */
import { axiosInstance } from '@lib/api/client'
import { ACCOUNTS_ENDPOINTS } from '@features/operators/constants/operators-api.constants'
import { FINANCE_ENDPOINTS } from '@features/finance/constants'
import { VEHICLES_ENDPOINTS } from '@features/vehicles/constants'
import type { AccountCrmDetail } from '@features/operators/utils/map-account'
import type { VehicleListApi } from '@features/vehicles/types'
import type { WalletListApi } from '@features/finance/types'
import type { PageNumberPaginated } from '@features/vehicles/types'

export type LiveBayAccount = {
  id: string
  kura_id: string
  display_name: string
  status: string
  kyc_status: string
  phone?: string | null
  photo_url?: string | null
  driver_ids: string[]
}

export type LiveBayVehicle = {
  id: string
  registration_plate: string
  account_id: string
  owner_name: string
  owner_kura_id: string
  vehicle_type: string
  make: string
  model_name: string
  battery_type_name: string
  current_battery_serial: string | null
  status: string
}

export type LiveBayContext = {
  vehicle: LiveBayVehicle
  account: LiveBayAccount
  walletBalanceNaira: number
  driverId: string
  planCovers: boolean
}

function mapVehicle(v: VehicleListApi): LiveBayVehicle {
  return {
    id: v.id,
    registration_plate: v.registration_plate,
    account_id: v.account_id,
    owner_name: v.owner_name,
    owner_kura_id: v.owner_kura_id,
    vehicle_type: v.vehicle_type,
    make: v.make,
    model_name: v.model_name,
    battery_type_name: v.battery_type_name,
    current_battery_serial: v.current_battery_serial,
    status: v.status,
  }
}

export async function fetchVehicleByPlate(plate: string): Promise<LiveBayVehicle | null> {
  const { data } = await axiosInstance.get<PageNumberPaginated<VehicleListApi>>(
    VEHICLES_ENDPOINTS.list,
    { params: { search: plate, page_size: 25 } },
  )
  const want = plate.trim().toUpperCase()
  const hit = (data.results ?? []).find(
    (v) => v.registration_plate.trim().toUpperCase() === want,
  )
  return hit ? mapVehicle(hit) : null
}

export async function fetchVehicleById(id: string): Promise<LiveBayVehicle | null> {
  const { data } = await axiosInstance.get<VehicleListApi>(VEHICLES_ENDPOINTS.vehicle(id))
  return data ? mapVehicle(data as VehicleListApi) : null
}

export async function fetchAccount(accountId: string): Promise<LiveBayAccount> {
  const { data } = await axiosInstance.get<AccountCrmDetail>(
    ACCOUNTS_ENDPOINTS.detail(accountId),
  )
  return {
    id: data.id,
    kura_id: data.kura_id,
    display_name: data.display_name || 'Operator',
    status: data.status,
    kyc_status: data.kyc_status,
    phone: data.phone,
    photo_url: data.photo_url,
    driver_ids: data.driver_ids ?? [],
  }
}

export async function fetchWalletBalanceNaira(accountId: string): Promise<number> {
  const { data } = await axiosInstance.get<PageNumberPaginated<WalletListApi>>(
    FINANCE_ENDPOINTS.wallets,
    { params: { account: accountId, page_size: 1 } },
  )
  const row = data.results?.[0]
  if (!row) return 0
  return (row.available_kobo ?? row.balance_kobo ?? 0) / 100
}

export async function fetchLiveBayContext(plate: string): Promise<LiveBayContext> {
  const vehicle = await fetchVehicleByPlate(plate)
  if (!vehicle) {
    throw new Error(`Vehicle ${plate} not in fleet.`)
  }
  const account = await fetchAccount(vehicle.account_id)
  const driverId = account.driver_ids[0]
  if (!driverId) {
    throw new Error('No driver on this account.')
  }
  const walletBalanceNaira = await fetchWalletBalanceNaira(account.id)
  return {
    vehicle,
    account,
    walletBalanceNaira,
    driverId,
    planCovers: false,
  }
}

export async function enrichHoldContext(opts: {
  accountId: string
  vehicleId: string
  driverId: string
}): Promise<{
  account: LiveBayAccount
  vehicle: LiveBayVehicle | null
  walletBalanceNaira: number
}> {
  const [account, vehicle, walletBalanceNaira] = await Promise.all([
    fetchAccount(opts.accountId),
    fetchVehicleById(opts.vehicleId).catch(() => null),
    fetchWalletBalanceNaira(opts.accountId),
  ])
  return { account, vehicle, walletBalanceNaira }
}
