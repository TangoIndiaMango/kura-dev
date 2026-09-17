import { useEffect, useState } from 'react'
import { Button, NumberInput, Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { KuraIllustrationModal } from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useHoldPolicy, useUpdateHoldPolicy } from './hooks/use-pricing'

const DEFAULTS = { defaultHoldMinutes: 15, maxExtendMinutes: 15 }

export function HoldLimitsPanel() {
  const { policy, isPending, isError, refetch } = useHoldPolicy()
  const update = useUpdateHoldPolicy()
  const [draft, setDraft] = useState(DEFAULTS)
  const [savedOpen, setSavedOpen] = useState(false)

  useEffect(() => {
    if (!policy) return
    setDraft({
      defaultHoldMinutes: policy.default_hold_minutes,
      maxExtendMinutes: policy.max_extend_minutes,
    })
  }, [policy])

  if (isPending) return <Skeleton height={220} radius="md" />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load hold limits.{' '}
        <button type="button" className="text-[var(--pr)]" onClick={() => refetch()}>
          Retry
        </button>
      </p>
    )
  }

  return (
    <>
      <div className="rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)] sm:p-6">
        <h2 className="text-[15px] font-bold text-[var(--tx)]">Bay hold limits</h2>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--mu)]">
          Default reservation window and the max minutes allowed on Extend Hold.
        </p>

        <div className="mt-5 grid max-w-lg gap-4">
          <NumberInput
            label="Default hold (minutes)"
            description="Applied to new reservations."
            min={5}
            max={60}
            value={draft.defaultHoldMinutes}
            onChange={(v) =>
              setDraft((p) => ({
                ...p,
                defaultHoldMinutes: typeof v === 'number' ? v : p.defaultHoldMinutes,
              }))
            }
          />
          <NumberInput
            label="Max extend (minutes)"
            description="Upper limit on the Extend Hold input."
            min={5}
            max={60}
            value={draft.maxExtendMinutes}
            onChange={(v) =>
              setDraft((p) => ({
                ...p,
                maxExtendMinutes: typeof v === 'number' ? v : p.maxExtendMinutes,
              }))
            }
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            color="brand"
            loading={update.isPending}
            disabled={update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({
                  default_hold_minutes: draft.defaultHoldMinutes,
                  max_extend_minutes: draft.maxExtendMinutes,
                })
                setSavedOpen(true)
              } catch (err) {
                notifications.show({
                  color: 'red',
                  message: apiErrorMessage(err, 'Could not save hold limits'),
                })
              }
            }}
          >
            Save hold limits
          </Button>
          <Button
            variant="subtle"
            disabled={update.isPending}
            onClick={() => setDraft({ ...DEFAULTS })}
          >
            Reset defaults
          </Button>
          <p className="text-[11.5px] text-[var(--mu)]">
            Defaults {DEFAULTS.defaultHoldMinutes} / {DEFAULTS.maxExtendMinutes} min
          </p>
        </div>
      </div>

      <KuraIllustrationModal
        opened={savedOpen}
        onClose={() => setSavedOpen(false)}
        illustrationId="offer-published"
        title="Hold limits saved"
        description="Extend Hold now uses these caps on live reservations."
        primaryAction={{ label: 'Done', onClick: () => setSavedOpen(false) }}
      />
    </>
  )
}
