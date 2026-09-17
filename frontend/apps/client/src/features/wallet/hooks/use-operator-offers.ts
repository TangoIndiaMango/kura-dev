import { useFetchData, usePostData } from '@shared/hooks/api'
import { CREDIT_API } from './use-operator-credit'

export const OFFERS_API = {
  mine: '/offers/mine/',
  accept: (id: string) => `/offers/assignments/${id}/accept/`,
} as const

export const offerQueryKeys = {
  all: ['credit-offers'] as const,
  mine: () => [...offerQueryKeys.all, 'mine'] as const,
}

export type OfferAssignmentMineApi = {
  id: string
  status: string
  amount_kobo: number | null
  channel: string
  offer_id: string
  offer_name: string
  offer_type: string
  summary: string
}

export function useMyOffers(options?: { enabled?: boolean }) {
  const query = useFetchData<OfferAssignmentMineApi[]>(
    OFFERS_API.mine,
    undefined,
    {
      enabled: options?.enabled !== false,
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    },
  )
  const offers = query.data ?? []
  return {
    ...query,
    offers,
    openOffers: offers.filter((o) => o.status === 'OFFERED'),
  }
}

export function useAcceptOffer() {
  return usePostData<
    { id: string; pin_grant: string; amount_kobo?: number },
    {
      id: string
      status: string
      amount_kobo: number | null
      offer_id: string
    }
  >(
    (v) => OFFERS_API.accept(v.id),
    [OFFERS_API.mine, CREDIT_API.eligibility, CREDIT_API.loans],
    {
      silentError: true,
      body: (v) => ({
        pin_grant: v.pin_grant,
        ...(v.amount_kobo != null ? { amount_kobo: v.amount_kobo } : {}),
      }),
    },
  )
}
