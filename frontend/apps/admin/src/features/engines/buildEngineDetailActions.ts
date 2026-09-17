import type { AdminDetailAction } from '@shared/components'
import type { EngineDetailApi, RetrofitDetailApi } from './types'

export function buildEngineDetailActions(opts: {
  engine: EngineDetailApi
  retrofit: RetrofitDetailApi | null
  safetyOk: boolean
  busy: boolean
  canRelease: boolean
  onInstall: () => void
  onChecklist: () => void
  onActivate: () => void
  onFail: () => void
  onReleaseRequest: () => void
  onRelease: () => void
  onCases: () => void
  onExport: () => void
}): AdminDetailAction[] {
  const { retrofit, safetyOk, busy, canRelease } = opts
  const rs = retrofit?.status
  const canInstall = Boolean(retrofit) && rs === 'INTAKE'
  const canChecklist = Boolean(retrofit) && rs === 'INSTALLED'
  const canActivate = Boolean(retrofit) && rs === 'CHECKED'
  const canFail = Boolean(retrofit) && (rs === 'INSTALLED' || rs === 'CHECKED')
  const canRequestRelease = opts.engine.status === 'STORED'

  const ops: AdminDetailAction[] = [
    ...(canInstall
      ? [
          {
            id: 'install',
            label: 'Mark installed',
            disabled: busy,
            onClick: opts.onInstall,
          },
        ]
      : []),
    ...(canChecklist
      ? [
          {
            id: 'checklist',
            label: safetyOk
              ? 'Submit checklist'
              : 'Submit checklist (incomplete)',
            disabled: !safetyOk || busy,
            onClick: opts.onChecklist,
          },
        ]
      : []),
    ...(canActivate
      ? [
          {
            id: 'activate',
            label: 'Activate e-boarder',
            disabled: !safetyOk || busy,
            onClick: opts.onActivate,
          },
        ]
      : []),
    ...(canFail
      ? [
          {
            id: 'fail',
            label: 'Mark safety failed',
            tone: 'danger' as const,
            disabled: busy,
            onClick: opts.onFail,
          },
        ]
      : []),
    ...(canRequestRelease
      ? [
          {
            id: 'release_request',
            label: 'Request release',
            disabled: busy,
            onClick: opts.onReleaseRequest,
          },
        ]
      : []),
    ...(canRelease
      ? [
          {
            id: 'release',
            label: 'Release engine',
            disabled: busy,
            onClick: opts.onRelease,
          },
        ]
      : []),
  ]

  return [
    ...ops,
    { id: 'ticket', label: 'Open cases', onClick: opts.onCases },
    { id: 'export', label: 'Export CSV', onClick: opts.onExport },
  ]
}
