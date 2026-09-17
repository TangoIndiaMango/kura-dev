import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AdminDetailPage,
  DetailPageLoadingSkeleton,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { useAuditEvents } from '@features/audit'
import {
  activityRowsFromAudit,
  exportOperatorHistory,
  operatorExtras,
} from './operatorDetailHelpers'
import {
  accountStatusLabel,
  accountStatusTone,
  kycStatusLabel,
} from './types'
import { OperatorProfileOverview } from './OperatorProfileOverview'
import { OperatorActivityTable } from './OperatorActivityTable'
import {
  OperatorCasesTab,
  OperatorLedgerTab,
  OperatorPlansTab,
  OperatorRiskTab,
  OperatorSwapsTab,
  OperatorVehiclesTab,
} from './OperatorCrmPanels'
import { OperatorsDetailModals } from './OperatorsDetailModals'
import { useOperator, useOperatorDetailStats, useOperatorKyc } from './hooks/use-operators'
import { useOperatorDetailActions } from './hooks/use-operator-detail-actions'
import { buildOperatorDetailActions } from './buildOperatorDetailActions'

const OPERATOR_TABS = [
  'overview', 'vehicles', 'plans', 'swaps', 'ledger', 'activity', 'cases', 'risk',
] as const

export function OperatorsDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const [activeTab] = useUrlTab('overview', { valid: OPERATOR_TABS })
  const { operator, account, isPending, isError } = useOperator(id)
  const { data: kyc } = useOperatorKyc(id)
  const { data: detailStats } = useOperatorDetailStats(id)
  const actionsApi = useOperatorDetailActions(id)

  const subjectIds = [id, account?.owner_user_id].filter(Boolean).join(',')
  const { events: auditEvents } = useAuditEvents({
    subject_id: subjectIds || undefined,
    page_size: 50,
    enabled: Boolean(id) && activeTab === 'activity',
  })

  const [discountId, setDiscountId] = useState(operator?.discountId)
  const [createSwapOpen, setCreateSwapOpen] = useState(false)
  const [assignDiscountOpen, setAssignDiscountOpen] = useState(false)
  const [draftDiscount, setDraftDiscount] = useState<string | null>(null)
  const [draftHub, setDraftHub] = useState<string | null>(null)

  useEffect(() => {
    setDiscountId(operator?.discountId)
  }, [operator?.id, operator?.discountId])

  if (isPending) return <DetailPageLoadingSkeleton />

  if (isError || !operator) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/operators')}
        backLabel="Back to operators"
        title="Operator not found"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      />
    )
  }

  const extras = operatorExtras(operator)
  const activity = activityRowsFromAudit(auditEvents)
  const liveOperator = {
    ...operator,
    discountId: discountId ?? operator.discountId,
    status: operator.status,
    kycStatus:
      actionsApi.success === 'verify-identity' || kyc?.status === 'VERIFIED'
        ? ('VERIFIED' as const)
        : actionsApi.success === 'reject-identity' || kyc?.status === 'REJECTED'
          ? ('REJECTED' as const)
          : operator.kycStatus,
    photoUrl: kyc?.photo_url || operator.photoUrl,
  }
  if (actionsApi.success === 'suspend') liveOperator.status = 'SUSPENDED'
  if (actionsApi.success === 'reactivate') liveOperator.status = 'ACTIVE'

  const statusTone = accountStatusTone(liveOperator.status)
  const hubOptions: Array<{ name: string }> = []
  const standingKpiTone =
    extras.accountStanding === 'Healthy'
      ? 'success'
      : extras.accountStanding === 'At risk'
        ? 'warning'
        : 'danger'
  const kycVia =
    (kyc?.verified_via as 'PSP' | 'PROVIDER' | 'MANUAL' | null | undefined) ??
    operator.verifiedVia ??
    null

  const actions = buildOperatorDetailActions({
    operator,
    liveStatus: liveOperator.status,
    liveKycStatus: liveOperator.kycStatus,
    kyc,
    hubOptions,
    discountId,
    activityExport: () =>
      exportOperatorHistory(operator.kuraId, operator.name, activity),
    actionsApi,
    onCreateSwap: (hubName) => {
      setDraftHub(hubName)
      setCreateSwapOpen(true)
    },
    onAssignDiscount: (id) => {
      setDraftDiscount(id)
      setAssignDiscountOpen(true)
    },
    onEdit: () => navigate(`/operators/${operator.id}/edit`),
  })

  return (
    <>
      <AdminDetailPage
        onBack={() => navigate('/operators')}
        backLabel="Back to operators"
        title={liveOperator.name}
        statusLabel={accountStatusLabel(liveOperator.status)}
        statusTone={statusTone}
        summaryRows={[
          { label: 'Full name', value: liveOperator.name },
          { label: 'KURA ID', value: liveOperator.kuraId },
          { label: 'Phone', value: liveOperator.phone },
          {
            label: 'KYC',
            value:
              liveOperator.kycStatus === 'VERIFIED'
                ? `Verified${kycVia ? ` · ${kycVia}` : ''}`
                : kycStatusLabel(liveOperator.kycStatus),
          },
        ]}
        entityKpis={[
          {
            title: 'Swap Access',
            value: extras.canSwap ? 'Eligible' : 'Blocked',
            sub: extras.canSwap ? 'Healthy standing' : 'Action required',
            tone: extras.canSwap ? 'success' : 'danger',
          },
          {
            title: 'Standing',
            value: extras.accountStanding,
            sub: 'From status + KYC',
            tone: standingKpiTone,
          },
          {
            title: 'Drivers',
            value: detailStats?.drivers_count ?? '—',
            sub: 'On account',
          },
          {
            title: 'ID docs',
            value: detailStats?.identity_docs_count ?? '—',
            sub: 'Submitted',
          },
        ]}
        actions={actions}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <OperatorProfileOverview
                operator={liveOperator}
                extras={extras}
                kycVia={kycVia}
                photosRequested={Boolean(kyc?.photos_requested)}
                requestNote={kyc?.request_note ?? null}
                kyc={kyc}
              />
            ),
          },
          {
            id: 'vehicles',
            label: 'Vehicles',
            count: operator.vehicleIds?.length,
            content: <OperatorVehiclesTab operator={liveOperator} />,
          },
          {
            id: 'plans',
            label: 'Plans',
            content: <OperatorPlansTab operator={liveOperator} />,
          },
          {
            id: 'swaps',
            label: 'Swaps',
            content: <OperatorSwapsTab operator={liveOperator} />,
          },
          {
            id: 'ledger',
            label: 'Ledger',
            content: <OperatorLedgerTab operator={liveOperator} />,
          },
          {
            id: 'activity',
            label: 'Activity',
            count: activeTab === 'activity' ? activity.length : undefined,
            content: (
              <OperatorActivityTable
                operatorId={operator.id}
                kuraId={operator.kuraId}
                rows={activity}
              />
            ),
          },
          {
            id: 'cases',
            label: 'Cases',
            content: <OperatorCasesTab operator={liveOperator} />,
          },
          {
            id: 'risk',
            label: 'Risk',
            content: <OperatorRiskTab operator={liveOperator} />,
          },
        ]}
      />

      <OperatorsDetailModals
        operatorName={operator.name}
        operatorPhone={operator.phone}
        discountId={discountId}
        draftDiscount={draftDiscount}
        setDraftDiscount={setDraftDiscount}
        draftHub={draftHub}
        setDraftHub={setDraftHub}
        assignDiscountOpen={assignDiscountOpen}
        setAssignDiscountOpen={setAssignDiscountOpen}
        createSwapOpen={createSwapOpen}
        setCreateSwapOpen={setCreateSwapOpen}
        actionsApi={actionsApi}
        onDiscountSaved={setDiscountId}
        onNavigateSwaps={() => navigate('/swaps')}
      />
    </>
  )
}
