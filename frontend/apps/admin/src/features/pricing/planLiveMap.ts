import type { PlanApi, SubscriptionListApi } from '@features/mobility'
import type { PlanRecord, PlanSubscriberRecord } from '@shared/mock/adminMockData'

const VT_LABEL: Record<string, PlanRecord['vehicleType']> = {
  MOTORCYCLE: 'Motorcycle',
  TRICYCLE: 'Tricycle',
  BOAT: 'Boat',
}

function periodOf(period: string): PlanRecord['period'] {
  if (period === 'week' || period === 'month' || period === 'swap') return period
  return 'day'
}

function durationLabel(plan: PlanApi): string {
  if (plan.period === 'swap') return 'Per swap'
  if (plan.duration_days == null) return '—'
  if (plan.duration_days === 1) return '24 hours'
  return `${plan.duration_days} days`
}

function statusOf(plan: PlanApi): PlanRecord['status'] {
  if (plan.status === 'DEACTIVATED' || plan.status === 'PENDING') {
    return plan.status
  }
  return plan.is_active ? 'ACTIVE' : 'DEACTIVATED'
}

export function planApiToRecord(plan: PlanApi): PlanRecord {
  const period = periodOf(plan.period)
  return {
    id: plan.id,
    name: plan.name,
    code: plan.code,
    vehicleType: VT_LABEL[plan.vehicle_type] ?? 'Motorcycle',
    price: Math.round(plan.price_kobo / 100),
    period,
    description: plan.description || `${plan.code} · ${plan.vehicle_type}`,
    subscribers: plan.active_subscriber_count ?? 0,
    status: statusOf(plan),
    swapAllowance:
      plan.swap_allowance == null ? 'unlimited' : plan.swap_allowance,
    autoRenew: plan.auto_renew_default,
    durationLabel: durationLabel(plan),
    createdAt: new Date(plan.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }
}

export function subscriptionToPlanSubscriber(
  row: SubscriptionListApi,
): PlanSubscriberRecord {
  const status =
    row.status === 'LAPSED_TO_PPS'
      ? 'LAPSED'
      : row.status === 'EXPIRED' || row.status === 'CANCELLED'
        ? 'EXPIRED'
        : 'ACTIVE'
  const amountKobo = row.amount_kobo ?? row.list_price_kobo ?? 0
  return {
    id: row.id,
    planId: row.plan_id,
    operatorName: row.account_name || 'Operator',
    operatorId: row.account_kura_id || row.account_id.slice(0, 8),
    vehicleLabel: row.vehicle_plate || '—',
    paymentDate: new Date(row.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    amount: Math.round(amountKobo / 100),
    status,
  }
}
