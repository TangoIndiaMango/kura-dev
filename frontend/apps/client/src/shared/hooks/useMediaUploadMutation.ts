import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { uploadMedia, type UploadedMedia } from '../../lib/api/media'

export type MediaUploadItem = {
  file: File
  kind: string
  /** Stable slot key so callers can map results (e.g. face / front / back). */
  key: string
}

export type MediaUploadStep = 'idle' | 'uploading' | 'submitting'

/**
 * TanStack mutation for one or more media uploads with real axios upload %.
 * Call `setStep('submitting')` after uploads if a domain POST follows.
 */
export function useMediaUploadMutation() {
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<MediaUploadStep>('idle')
  const perFile = useRef<number[]>([])

  const mutation = useMutation({
    mutationKey: ['media', 'upload'],
    mutationFn: async (items: MediaUploadItem[]) => {
      if (!items.length) {
        throw new Error('No files to upload')
      }
      setStep('uploading')
      setProgress(0)
      perFile.current = items.map(() => 0)

      const bump = () => {
        const avg =
          perFile.current.reduce((sum, n) => sum + n, 0) / perFile.current.length
        setProgress(Math.min(100, Math.round(avg)))
      }

      const results = await Promise.all(
        items.map(async (item, index) => {
          const uploaded = await uploadMedia(item.file, item.kind, {
            onProgress: (pct) => {
              perFile.current[index] = pct
              bump()
            },
          })
          perFile.current[index] = 100
          bump()
          return { key: item.key, uploaded } as {
            key: string
            uploaded: UploadedMedia
          }
        }),
      )

      setProgress(100)
      return Object.fromEntries(results.map((r) => [r.key, r.uploaded])) as Record<
        string,
        UploadedMedia
      >
    },
    onError: () => {
      setStep('idle')
    },
  })

  const resetProgress = () => {
    setProgress(0)
    setStep('idle')
    perFile.current = []
  }

  return {
    ...mutation,
    progress,
    step,
    setStep,
    resetProgress,
    isUploading: mutation.isPending && step === 'uploading',
    isBusy: mutation.isPending || step === 'submitting',
  }
}
