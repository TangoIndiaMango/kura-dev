import {
  MOCK_ALERT_RULES,
  type AlertRuleRecord,
} from '@shared/mock/adminMockData'

let sessionRules: AlertRuleRecord[] = [...MOCK_ALERT_RULES]

export function listAlertRules(): AlertRuleRecord[] {
  return [...sessionRules]
}

export function findAlertRule(id: string): AlertRuleRecord | null {
  return sessionRules.find((r) => r.id === id) ?? null
}

export function upsertAlertRule(rule: AlertRuleRecord): AlertRuleRecord {
  const idx = sessionRules.findIndex((r) => r.id === rule.id)
  if (idx >= 0) {
    sessionRules = sessionRules.map((r) => (r.id === rule.id ? rule : r))
  } else {
    sessionRules = [rule, ...sessionRules]
  }
  return rule
}

export function setAlertRuleStatus(
  id: string,
  status: AlertRuleRecord['status'],
): AlertRuleRecord | null {
  const found = findAlertRule(id)
  if (!found) return null
  const next = { ...found, status }
  upsertAlertRule(next)
  return next
}

export function nextAlertRuleId(): string {
  const n = sessionRules.length + 1
  return `RULE-${String(n).padStart(2, '0')}`
}
