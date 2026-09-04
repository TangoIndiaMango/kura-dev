import { useEffect, useState } from 'react'
import { Box, Center, Group, Stack, Text, ActionIcon, Image } from '@mantine/core'
import { Dropzone, type FileWithPath, MIME_TYPES } from '@mantine/dropzone'
import { CloudUploadIcon, Edit02Icon, Delete02Icon, Cancel01Icon } from 'hugeicons-react'
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
  maxSizeMB?: number
  minHeight?: number
}

const DEFAULT_IMAGE_SIZE_MB = 2
const DEFAULT_VIDEO_SIZE_MB = 5

export function MediaDropzone({
  value,
  onChange,
  error,
  existingMediaName,
  existingMediaUrl,
  label = 'Upload Media',
  description = 'Drag and drop files here to upload. We can accept image or video files.',
  accept = [MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.mp4],
  maxSizeMB,
  minHeight = 280,
}: MediaDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)

  const maxBytes =
    (maxSizeMB ?? (accept.includes(MIME_TYPES.mp4) ? DEFAULT_VIDEO_SIZE_MB : DEFAULT_IMAGE_SIZE_MB)) *
    1024 *
    1024

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      setMediaType(value.type.startsWith('video/') ? 'video' : 'image')
      return () => URL.revokeObjectURL(url)
    } else if (existingMediaUrl) {
      setPreviewUrl(existingMediaUrl)
      setMediaType(existingMediaUrl.endsWith('.mp4') ? 'video' : 'image')
    } else {
      setPreviewUrl(null)
      setMediaType(null)
    }
  }, [value, existingMediaUrl])

  const handleDrop = (files: FileWithPath[]) => {
    const file = files[0]
    if (file) {
      onChange(file)
    }
  }

  const handleReject = () => {
    notifications.show({
      title: 'File rejected',
      message: `Please upload a valid file under ${maxSizeMB ?? 2}MB.`,
      color: 'red',
    })
  }

  if (previewUrl) {
    return (
      <Stack gap="xs">
        <Box
          pos="relative"
          className="group overflow-hidden rounded-lg border border-gray-300 bg-gray-50"
          style={{ minHeight }}
        >
          {mediaType === 'video' ? (
            <video
              src={previewUrl}
              controls
              className="h-full w-full max-h-[360px] object-contain"
            />
          ) : (
            <Image
              src={previewUrl}
              alt="Media preview"
              fit="contain"
              h={minHeight}
              className="w-full"
            />
          )}

          <Center
            pos="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="rgba(0, 0, 0, 0.5)"
            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <Group gap="md">
              <Dropzone
                onDrop={handleDrop}
                onReject={handleReject}
                maxSize={maxBytes}
                accept={accept}
                multiple={false}
                classNames={{ root: 'p-0 border-0 bg-transparent hover:bg-transparent' }}
              >
                <ActionIcon
                  size="xl"
                  radius="xl"
                  color="white"
                  variant="filled"
                  title="Change Media"
                >
                  <Edit02Icon size={24} color="var(--mantine-color-dark-9)" />
                </ActionIcon>
              </Dropzone>

              <ActionIcon
                onClick={() => onChange(null)}
                size="xl"
                radius="xl"
                color="red"
                variant="filled"
                title="Remove Media"
              >
                <Delete02Icon size={24} color="white" />
              </ActionIcon>
            </Group>
          </Center>
        </Box>
        {error && (
          <Text fz="sm" c="red.6">
            {error}
          </Text>
        )}
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
        styles={{ root: { minHeight } }}
        className="flex flex-col justify-center bg-gray-50 border-gray-300"
      >
        <Center className="h-full py-8">
          <Stack align="center" gap="md" className="pointer-events-none">
            <CloudUploadIcon size={48} color="var(--mantine-color-gray-5)" />
            <Stack gap={4} align="center">
              <Text fw={600} fz="md" c="dark.7">
                {label}
              </Text>
              <Text fz="sm" c="gray.6" ta="center" maw={480}>
                {description}
              </Text>
            </Stack>

            {existingMediaName && (
              <Text fz="sm" c="teal.7">
                Existing: {existingMediaName}
              </Text>
            )}
          </Stack>
        </Center>
      </Dropzone>

      {error && (
        <Text fz="sm" c="red.6">
          {error}
        </Text>
      )}
    </Stack>
  )
}
