import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { WALLET_API } from '../../wallet/hooks/use-operator-wallet'

export const PLANS_API = {
  plans: '/mobility/plans/',
  subscriptions: '/mobility/subscriptions/',
  renew: (id: string) => `/mobility/subscriptions/${id}/renew/`,
  switch: (id: string) => `/mobility/subscriptions/${id}/switch/`,
  switchPreview: (id: string) => `/mobility/subscriptions/${id}/switch-preview/`,
  cancel: (id: string) => `/mobility/subscriptions/${id}/cancel/`,
  autoRenew: (id: string) => `/mobility/subscriptions/${id}/auto-renew/`,
} as const

export const plansQueryKeys = {
  catalogue: PLANS_API.plans,
  subscriptions: PLANS_API.subscriptions,
} as const

export type PlanApi = {
  id: string
  code: string
  name: string
  vehicle_type: string
  period: string
  duration_days: number | null
  swap_allowance: number | null
  price_kobo: number
  description: string
  is_active: boolean
}

export type SubscriptionApi = {
  id: string
  vehicle_id: string
  plan_id: string
  queued_plan_id?: string | null
  plan_name: string
  plan_code: string
  plan_period: string
  vehicle_plate: string
  starts_at: string
  ends_at: string
  swaps_used: number
  swaps_allowance: number | null
  status: string
  auto_renew: boolean
  list_price_kobo?: number
  amount_kobo?: number
  payment_id?: string | null
}

export type SwitchPreviewApi = {
  kind: string
  effective: string
  current_plan_id: string
  current_plan_name: string
  current_list_kobo: number
  target_plan_id: string
  target_plan_name: string
  target_list_kobo: number
  due_kobo: number
  discount_kobo: number
  refund_kobo: number
  keeps_until: string
  starts_at: string
  pin_required: boolean
  message: string
  queued_plan_id: string | null
}

type Page<T> = { results: T[] }

const invalidatePlans = [plansQueryKeys.subscriptions, WALLET_API.mine]

export function useCataloguePlans(options?: { enabled?: boolean }) {
  const query = useFetchData<Page<PlanApi>>(
    PLANS_API.plans,
    { page_size: 50 },
    {
      enabled: options?.enabled !== false,
      staleTime: 5 * 60_000,
      keepPreviousData: true,
    },
  )
  return { ...query, plans: query.data?.results ?? [] }
}

export function useMySubscriptions(options?: { enabled?: boolean }) {
  const query = useFetchData<Page<SubscriptionApi>>(
    PLANS_API.subscriptions,
    { page_size: 50 },
    {
      enabled: options?.enabled !== false,
      staleTime: 60_000,
      keepPreviousData: true,
      refetchOnWindowFocus: true,
    },
  )
  return { ...query, subscriptions: query.data?.results ?? [] }
}

export function usePurchaseSubscription() {
  return usePostData<
    {
      vehicle: string
      plan: string
      auto_renew?: boolean
      discount_code?: string
      idempotency_key: string
      pin_grant: string
      payment_mode?: string
      channel?: string
    },
    SubscriptionApi
  >(PLANS_API.subscriptions, invalidatePlans, { silentError: true })
}

export function useRenewSubscription() {
  return usePostData<
    {
      id: string
      discount_code?: string
      idempotency_key: string
      pin_grant: string
      channel?: string
    },
    SubscriptionApi
  >((v) => PLANS_API.renew(v.id), invalidatePlans, {
    silentError: true,
    body: (v) => ({
      discount_code: v.discount_code ?? '',
      idempotency_key: v.idempotency_key,
      pin_grant: v.pin_grant,
      channel: v.channel ?? 'App',
    }),
  })
}

export function useSwitchPreview() {
  return usePostData<
    {
      id: string
      plan: string
      immediate?: boolean | null
      discount_code?: string
      channel?: string
    },
    SwitchPreviewApi
  >((v) => PLANS_API.switchPreview(v.id), undefined, {
    silentError: true,
    body: (v) => ({
      plan: v.plan,
      immediate: v.immediate,
      discount_code: v.discount_code ?? '',
      channel: v.channel ?? 'App',
    }),
  })
}

export function useSwitchSubscription() {
  return usePostData<
    {
      id: string
      plan: string
      immediate?: boolean | null
      discount_code?: string
      idempotency_key?: string
      pin_grant?: string
      channel?: string
    },
    SubscriptionApi
  >((v) => PLANS_API.switch(v.id), invalidatePlans, {
    silentError: true,
    body: (v) => ({
      plan: v.plan,
      immediate: v.immediate,
      discount_code: v.discount_code ?? '',
      idempotency_key: v.idempotency_key ?? '',
      pin_grant: v.pin_grant ?? '',
      channel: v.channel ?? 'App',
    }),
  })
}

export function useCancelSubscription() {
  return usePostData<{ id: string; reason?: string }, SubscriptionApi>(
    (v) => PLANS_API.cancel(v.id),
    invalidatePlans,
    {
      silentError: true,
      body: (v) => ({ reason: v.reason ?? '' }),
    },
  )
}

export function useSetAutoRenew() {
  return usePatchData<{ id: string; auto_renew: boolean }, SubscriptionApi>(
    (v) => PLANS_API.autoRenew(v.id),
    [plansQueryKeys.subscriptions],
    {
      silentError: true,
      body: (v) => ({ auto_renew: v.auto_renew }),
    },
  )
}
