import { useLocation, useParams } from 'react-router-dom'
import { AlertsPanel } from '@features/alerts/AlertsPanel'
import { AlertsDetailPanel } from '@features/alerts/AlertsDetailPanel'
import { AlertRuleFormPanel } from '@features/alerts/AlertRuleFormPanel'

export default function AlertsPage() {
  const { id, ruleId } = useParams<{ id?: string; ruleId?: string }>()
  const { pathname } = useLocation()

  if (pathname.endsWith('/alerts/rules/new')) return <AlertRuleFormPanel />
  if (ruleId && pathname.endsWith('/edit')) {
    return <AlertRuleFormPanel ruleId={ruleId} />
  }
  if (id) return <AlertsDetailPanel />
  return <AlertsPanel />
}
