import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { AdminDetailPage } from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useCapabilities } from '../auth/useCapabilities'
import { buildEngineDetailActions } from './buildEngineDetailActions'
import {
  makeEngineDetailHandlers,
  type EngineDetailSuccess,
} from './engineDetailHandlers'
import { EnginesDetailDocuments } from './EnginesDetailDocuments'
import { EnginesDetailModals } from './EnginesDetailModals'
import { EnginesDetailOverview } from './EnginesDetailOverview'
import { EnginesDetailRetrofit } from './EnginesDetailRetrofit'
import {
  allSafetyPassed,
  daysInCustody,
  emptySafetyChecks,
  formatEngineSince,
  mergeSafetyChecks,
  petrolLabel,
  retrofitStageLabel,
  retrofitStageTone,
} from './engineHelpers'
import {
  useActivateRetrofit,
  useEngine,
  useEngineRelease,
  useEngineReleaseRequest,
  useRetrofit,
  useRetrofitChecklist,
  useRetrofitInstall,
} from './hooks/use-engines'

type ActionKind = EngineDetailSuccess

export function EnginesDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { engine, isPending, isError, refetch } = useEngine(id)
  const { retrofit, refetch: refetchRetrofit } = useRetrofit(engine?.retrofit_id, {
    enabled: Boolean(engine?.retrofit_id),
  })
  const [pending, setPending] = useState<ActionKind | null>(null)
  const [success, setSuccess] = useState<ActionKind | null>(null)
  const [safety, setSafety] = useState(emptySafetyChecks())

  useEffect(() => {
    if (retrofit?.checklist) setSafety(mergeSafetyChecks(retrofit.checklist))
  }, [retrofit?.id, retrofit?.checklist])

  const releaseReq = useEngineReleaseRequest(engine?.id ?? '')
  const releaseMut = useEngineRelease(engine?.id ?? '')
  const activateMut = useActivateRetrofit(retrofit?.id ?? '')
  const checklistMut = useRetrofitChecklist(retrofit?.id ?? '')
  const installMut = useRetrofitInstall(retrofit?.id ?? '')

  if (!can('engines:manage')) {
    return (
      <AdminDetailPage
        backLabel="Back to engines"
        onBack={() => navigate('/engines')}
        breadcrumbs={[
          { label: 'Engines', to: '/engines' },
          { label: '—' },
        ]}
        title="Permission required"
        summaryRows={[{ label: 'Cap', value: 'engines:manage' }]}
      />
    )
  }

  if (isPending) {
    return (
      <AdminDetailPage
        backLabel="Back to engines"
        onBack={() => navigate('/engines')}
        title="Loading…"
        summaryRows={[{ label: 'ID', value: id }]}
      >
        <Skeleton height={280} radius="md" />
      </AdminDetailPage>
    )
  }

  if (isError || !engine) {
    return (
      <AdminDetailPage
        backLabel="Back to engines"
        onBack={() => navigate('/engines')}
        breadcrumbs={[{ label: 'Engines', to: '/engines' }, { label: id }]}
        title="Engine not found"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  const safetyOk = allSafetyPassed(safety)
  const hubLabel = engine.storage_hub_name ?? engine.storage_hub_code ?? '—'
  const busy =
    releaseReq.isPending ||
    releaseMut.isPending ||
    activateMut.isPending ||
    checklistMut.isPending ||
    installMut.isPending

  const stage = retrofitStageLabel({
    kind: 'engine',
    engineStatus: engine.status,
    retrofitStatus: engine.retrofit_status ?? retrofit?.status ?? null,
  })
  const stageTone = retrofitStageTone(stage)
  const statusTone =
    stageTone === 'info' || stageTone === 'neutral' ? 'default' : stageTone

  const handlers = makeEngineDetailHandlers({
    hasRetrofit: Boolean(retrofit),
    safety,
    safetyOk,
    installMut,
    activateMut,
    checklistMut,
    releaseReq,
    releaseMut,
    refresh: () => Promise.all([refetch(), refetchRetrofit()]),
    setPending,
    setSuccess,
  })

  const actions = buildEngineDetailActions({
    engine,
    retrofit,
    safetyOk,
    busy,
    canRelease: engine.status === 'RELEASE_REQUESTED' && can('engines:release'),
    onInstall: () => setPending('install'),
    onChecklist: () => setPending('checklist'),
    onActivate: () => setPending('activate'),
    onFail: () => setPending('fail'),
    onReleaseRequest: () => setPending('release_request'),
    onRelease: () => setPending('release'),
    onCases: () => navigate('/cases'),
    onExport: () =>
      downloadCsv(
        `${engine.tag}.csv`,
        ['tag', 'vehicle', 'owner', 'hub', 'stage', 'since'],
        [
          [
            engine.tag,
            engine.vehicle_reg,
            engine.owner_name,
            hubLabel,
            stage,
            formatEngineSince(engine.created_at),
          ],
        ],
      ),
  })

  return (
    <>
      <AdminDetailPage
        backLabel="Back to engines"
        onBack={() => navigate('/engines')}
        breadcrumbs={[
          { label: 'Engines', to: '/engines' },
          { label: engine.tag },
        ]}
        title={engine.tag}
        subtitle={`${petrolLabel(engine.make, engine.model, engine.hp) || 'Petrol engine'} · ${hubLabel}`}
        statusLabel={stage}
        statusTone={statusTone}
        layout="timeline"
        summaryTitle="Related"
        summaryRows={[
          { label: 'Owner', value: engine.owner_name },
          { label: 'Vehicle', value: engine.vehicle_reg || '—' },
          {
            label: 'E-boarder',
            value: retrofit?.eboarder_serial || engine.eboarder_serial || '—',
          },
          { label: 'Hub', value: hubLabel },
        ]}
        entityKpis={[
          {
            title: 'Stage',
            value: stage,
            sub: engine.status.replace(/_/g, ' '),
            tone: statusTone === 'default' ? undefined : statusTone,
          },
          {
            title: 'Days in custody',
            value: String(daysInCustody(engine.created_at)),
            sub: formatEngineSince(engine.created_at),
          },
          {
            title: 'Condition',
            value: engine.condition_grade,
            sub: petrolLabel(engine.make, engine.model, engine.hp) || 'Petrol',
          },
          {
            title: 'Hub',
            value: engine.storage_hub_code || hubLabel,
            sub: engine.storage_hub_name ?? undefined,
          },
        ]}
        actions={actions}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <EnginesDetailOverview engine={engine} hubLabel={hubLabel} />
            ),
          },
          {
            id: 'documents',
            label: 'Documents',
            content: (
              <EnginesDetailDocuments engine={engine} retrofit={retrofit} />
            ),
          },
          ...(engine.retrofit_id
            ? [
                {
                  id: 'retrofit',
                  label: 'Retrofit',
                  content: (
                    <EnginesDetailRetrofit
                      engine={engine}
                      retrofit={retrofit}
                      safety={safety}
                      onSafetyChange={setSafety}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
      <EnginesDetailModals
        tag={engine.tag}
        pending={pending}
        success={success}
        busy={busy}
        safetyOk={safetyOk}
        initialEboarderSerial={retrofit?.eboarder_serial ?? ''}
        onClosePending={() => setPending(null)}
        onCloseSuccess={() => setSuccess(null)}
        onInstall={handlers.onInstall}
        onChecklist={handlers.onChecklist}
        onActivate={handlers.onActivate}
        onFail={handlers.onFail}
        onReleaseRequest={handlers.onReleaseRequest}
        onRelease={handlers.onRelease}
        onOpenCases={() => {
          setSuccess(null)
          navigate('/cases')
        }}
      />
    </>
  )
}
