import { useEffect, useState } from 'react'
import { ActionIcon, Box, Center, Group, Image, Stack, Text } from '@mantine/core'
import { Dropzone, type FileWithPath, MIME_TYPES } from '@mantine/dropzone'
import { CloudUploadIcon, Delete02Icon, Edit02Icon } from 'hugeicons-react'
import { notifications } from '@mantine/notifications'

export interface MediaDropzoneProps {
  value: File | null
  onChange: (file: File | null) => void
  error?: string | null
  existingMediaName?: string | null
  existingMediaUrl?: string | null
  label?: string
  description?: string
  accept?: string[]
  /** Defaults: 5 MB images (SUPPORT/DRIVER_PHOTO per media API), 20 MB if video allowed */
  maxSizeMB?: number
  minHeight?: number
  /** Compact for dense mobile forms */
  compact?: boolean
}

const DEFAULT_IMAGE_SIZE_MB = 5

export function MediaDropzone({
  value,
  onChange,
  error,
  existingMediaName,
  existingMediaUrl,
  label = 'Upload photo',
  description = 'Drag & drop, or tap to browse. PNG or JPG · max 5 MB.',
  accept = [MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.webp],
  maxSizeMB = DEFAULT_IMAGE_SIZE_MB,
  minHeight = 180,
  compact = false,
}: MediaDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const height = compact ? Math.min(minHeight, 140) : minHeight
  const maxBytes = maxSizeMB * 1024 * 1024

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      setMediaType(value.type.startsWith('video/') ? 'video' : 'image')
      return () => URL.revokeObjectURL(url)
    }
    if (existingMediaUrl) {
      setPreviewUrl(existingMediaUrl)
      setMediaType(existingMediaUrl.toLowerCase().includes('.mp4') ? 'video' : 'image')
      return
    }
    setPreviewUrl(null)
    setMediaType(null)
  }, [value, existingMediaUrl])

  const handleDrop = (files: FileWithPath[]) => {
    const file = files[0]
    if (file) onChange(file)
  }

  const handleReject = () => {
    notifications.show({
      title: 'File rejected',
      message: `Use PNG, JPG, or WebP under ${maxSizeMB} MB.`,
      color: 'red',
    })
  }

  if (previewUrl) {
    return (
      <Stack gap="xs">
        <Box
          pos="relative"
          className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg)]"
          style={{ minHeight: height }}
        >
          {mediaType === 'video' ? (
            <video
              src={previewUrl}
              controls
              className="h-full w-full max-h-[320px] object-contain"
            />
          ) : (
            <Image
              src={previewUrl}
              alt="Upload preview"
              fit="contain"
              h={height}
              className="w-full"
            />
          )}

          {/* Always visible on mobile — hover alone is not enough on touch */}
          <Group
            gap="sm"
            justify="flex-end"
            className="absolute bottom-2 right-2 left-2 sm:left-auto"
          >
            <Dropzone
              onDrop={handleDrop}
              onReject={handleReject}
              maxSize={maxBytes}
              accept={accept}
              multiple={false}
              classNames={{
                root: 'p-0 border-0 bg-transparent hover:bg-transparent',
              }}
            >
              <ActionIcon
                size="lg"
                radius="xl"
                variant="filled"
                color="gray"
                title="Replace"
                aria-label="Replace photo"
                className="bg-white/95 text-[var(--kura-text)] shadow-md"
              >
                <Edit02Icon size={18} />
              </ActionIcon>
            </Dropzone>
            <ActionIcon
              onClick={() => onChange(null)}
              size="lg"
              radius="xl"
              variant="filled"
              color="red"
              title="Remove"
              aria-label="Remove photo"
              className="shadow-md"
            >
              <Delete02Icon size={18} color="white" />
            </ActionIcon>
          </Group>
        </Box>
        {value ? (
          <Text size="xs" c="dimmed" className="text-[var(--kura-muted)]">
            {value.name} · {(value.size / (1024 * 1024)).toFixed(2)} MB
          </Text>
        ) : existingMediaName ? (
          <Text size="xs" c="dimmed" className="text-[var(--kura-muted)]">
            {existingMediaName}
          </Text>
        ) : null}
        {error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : null}
      </Stack>
    )
  }

  return (
    <Stack gap="xs">
      <Dropzone
        onDrop={handleDrop}
        onReject={handleReject}
        maxSize={maxBytes}
        accept={accept}
        multiple={false}
        styles={{ root: { minHeight: height } }}
        className="flex flex-col justify-center rounded-2xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]"
      >
        <Center className="h-full px-4 py-6">
          <Stack align="center" gap="sm" className="pointer-events-none">
            <span className="rounded-full bg-[var(--kura-teal)]/12 p-3 text-[var(--kura-teal-bright)]">
              <CloudUploadIcon size={compact ? 28 : 36} />
            </span>
            <Stack gap={4} align="center">
              <Text fw={700} size="sm" className="text-[var(--kura-text)]">
                {label}
              </Text>
              <Text size="xs" ta="center" maw={280} className="text-[var(--kura-muted)]">
                {description}
              </Text>
            </Stack>
            {existingMediaName ? (
              <Text size="xs" className="text-[var(--kura-teal-bright)]">
                Existing: {existingMediaName}
              </Text>
            ) : null}
          </Stack>
        </Center>
      </Dropzone>
      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
