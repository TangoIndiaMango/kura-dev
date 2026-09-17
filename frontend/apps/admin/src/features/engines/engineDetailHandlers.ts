import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import type { EngineSafetyChecks } from './types'

type Mutate = {
  mutateAsync: (vars: never) => Promise<unknown>
}

type InstallMut = {
  mutateAsync: (vars: {
    eboarder_id?: string
    eboarder_serial: string
    photo_asset_ids: string[]
  }) => Promise<unknown>
}

type ChecklistMut = {
  mutateAsync: (vars: {
    checklist: EngineSafetyChecks
    failure_reason?: string
  }) => Promise<unknown>
}

type ReleaseReqMut = {
  mutateAsync: (vars: { note?: string }) => Promise<unknown>
}

type ReleaseMut = {
  mutateAsync: (vars: {
    photo_asset_ids: string[]
    signature_asset_id: string
  }) => Promise<unknown>
}

export type EngineDetailSuccess =
  | 'install'
  | 'checklist'
  | 'activate'
  | 'fail'
  | 'release_request'
  | 'release'

export function makeEngineDetailHandlers(opts: {
  hasRetrofit: boolean
  safety: EngineSafetyChecks
  safetyOk: boolean
  installMut: InstallMut
  activateMut: Mutate
  checklistMut: ChecklistMut
  releaseReq: ReleaseReqMut
  releaseMut: ReleaseMut
  refresh: () => Promise<unknown>
  setPending: (v: null) => void
  setSuccess: (v: EngineDetailSuccess) => void
}) {
  const fail = (err: unknown, fallback: string) => {
    notifications.show({
      color: 'red',
      message: apiErrorMessage(err, fallback),
    })
    opts.setPending(null)
  }

  return {
    onInstall: async (payload: {
      eboarder_id?: string
      eboarder_serial: string
      photo_asset_ids: string[]
    }) => {
      if (!opts.hasRetrofit) {
        opts.setPending(null)
        return
      }
      try {
        await opts.installMut.mutateAsync(payload)
        await opts.refresh()
        opts.setPending(null)
        opts.setSuccess('install')
      } catch (err) {
        fail(err, 'Could not mark installed')
      }
    },
    onChecklist: async () => {
      if (!opts.hasRetrofit || !opts.safetyOk) {
        opts.setPending(null)
        return
      }
      try {
        await opts.checklistMut.mutateAsync({ checklist: opts.safety })
        await opts.refresh()
        opts.setPending(null)
        opts.setSuccess('checklist')
      } catch (err) {
        fail(err, 'Could not submit checklist')
      }
    },
    onActivate: async () => {
      if (!opts.hasRetrofit || !opts.safetyOk) {
        opts.setPending(null)
        return
      }
      try {
        await opts.activateMut.mutateAsync({} as never)
        await opts.refresh()
        opts.setPending(null)
        opts.setSuccess('activate')
      } catch (err) {
        fail(err, 'Could not activate')
      }
    },
    onFail: async (reason?: string) => {
      if (!opts.hasRetrofit) {
        opts.setPending(null)
        return
      }
      try {
        await opts.checklistMut.mutateAsync({
          checklist: { ...opts.safety, hull: false },
          failure_reason: (reason || '').trim() || 'Marked failed from admin',
        })
        await opts.refresh()
        opts.setPending(null)
        opts.setSuccess('fail')
      } catch (err) {
        fail(err, 'Could not mark failed')
      }
    },
    onReleaseRequest: async (reason?: string) => {
      try {
        await opts.releaseReq.mutateAsync({ note: reason })
        await opts.refresh()
        opts.setPending(null)
        opts.setSuccess('release_request')
      } catch (err) {
        fail(err, 'Could not request release')
      }
    },
    onRelease: async (payload: {
      photo_asset_ids: string[]
      signature_asset_id: string
    }) => {
      if (!payload.photo_asset_ids.length || !payload.signature_asset_id) {
        opts.setPending(null)
        return
      }
      try {
        await opts.releaseMut.mutateAsync(payload)
        await opts.refresh()
        opts.setPending(null)
        opts.setSuccess('release')
      } catch (err) {
        fail(err, 'Could not release engine')
      }
    },
  }
}
