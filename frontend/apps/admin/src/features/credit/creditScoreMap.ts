import type { CreditScoreApi, CreditScoreRow, CreditScoreStatus } from './types'

export function scoreStatusFromApi(
  row: CreditScoreApi,
  threshold = 60,
): CreditScoreStatus {
  if (row.computed_by === 'MANUAL' || Boolean(row.override_reason?.trim())) {
    return 'OVERRIDE'
  }
  return row.score >= threshold ? 'ELIGIBLE' : 'BELOW_THRESHOLD'
}

export function mapCreditScore(
  row: CreditScoreApi,
  threshold = 60,
): CreditScoreRow {
  const status = scoreStatusFromApi(row, threshold)
  return {
    id: row.id,
    accountId: row.account_id,
    score: row.score,
    limitKobo: row.recommended_limit_kobo,
    computedBy: row.computed_by,
    computedAt: row.computed_at,
    overrideReason: row.override_reason ?? '',
    status,
    eligible: status === 'ELIGIBLE' || status === 'OVERRIDE',
  }
}

export function scoreTone(status: CreditScoreStatus) {
  if (status === 'ELIGIBLE') return 'success' as const
  if (status === 'OVERRIDE') return 'warning' as const
  return 'danger' as const
}

export function scoreBands(scores: CreditScoreRow[]) {
  const bands = [
    { label: '0–9', min: 0, max: 9 },
    { label: '10–19', min: 10, max: 19 },
    { label: '20–29', min: 20, max: 29 },
    { label: '30–39', min: 30, max: 39 },
    { label: '40–49', min: 40, max: 49 },
    { label: '50–59', min: 50, max: 59 },
    { label: '60–69', min: 60, max: 69 },
    { label: '70–79', min: 70, max: 79 },
    { label: '80–89', min: 80, max: 89 },
    { label: '90–100', min: 90, max: 100 },
  ]
  return bands.map((b) => ({
    label: b.label,
    n: scores.filter((s) => s.score >= b.min && s.score <= b.max).length,
  }))
}

export function shortAccountId(id: string) {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}
