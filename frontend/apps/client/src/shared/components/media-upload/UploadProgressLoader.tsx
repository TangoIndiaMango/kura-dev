import React from 'react'
import { KuraIllustrationModal } from '../KuraIllustrationModal'
import type { MediaUploadStep } from '../../hooks/useMediaUploadMutation'

type UploadProgressLoaderProps = {
  /** Typically `mutation.isPending || step === 'submitting'`. */
  open: boolean
  /** 0–100 from axios via `useMediaUploadMutation().progress`. */
  progress: number
  step: MediaUploadStep
  title?: string
  description?: string
  /** Optional dismiss while work continues in the background. */
  onHide?: () => void
}

function labelFor(step: MediaUploadStep, progress: number) {
  if (step === 'submitting') return 'Saving your details…'
  if (step === 'uploading') {
    if (progress <= 0) return 'Starting upload…'
    if (progress >= 100) return 'Finishing upload…'
    return `Uploading photos… ${progress}%`
  }
  return 'Please wait…'
}

/**
 * Progress sheet driven by TanStack `useMediaUploadMutation` state.
 * Bind `open` / `progress` / `step` from the mutation — do not invent local loaders.
 */
export function UploadProgressLoader({
  open,
  progress,
  step,
  title,
  description,
  onHide,
}: UploadProgressLoaderProps) {
  const resolvedTitle =
    title ??
    (step === 'submitting' ? 'Submitting identity' : 'Uploading photos')
  const resolvedDescription =
    description ??
    (step === 'submitting'
      ? 'Almost done — attaching your photos to your account.'
      : 'Keep this screen open until upload finishes.')

  return (
    <KuraIllustrationModal
      opened={open}
      onClose={() => onHide?.()}
      illustrationId="syncing"
      title={resolvedTitle}
      description={resolvedDescription}
      progressValue={step === 'uploading' ? progress : undefined}
      progressLabel={labelFor(step, progress)}
      closeOnClickOutside={false}
      primaryOutline
      primaryAction={{
        label: onHide ? 'Hide' : 'Please wait…',
        onClick: () => onHide?.(),
        loading: !onHide,
      }}
    />
  )
}
