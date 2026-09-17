import { Box, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { RevealImage } from './RevealImage'

type FileKind = 'image' | 'pdf' | 'video' | 'audio' | 'document'

function getFileKind(
  url: string,
  preferImage?: boolean,
  contentType?: string | null,
): FileKind {
  if (preferImage) return 'image'
  const mime = (contentType ?? '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'

  const path = url.split('?')[0]?.toLowerCase() ?? url.toLowerCase()
  if (
    /\.(jpe?g|png|gif|webp|bmp|svg|heic|avif)$/.test(path) ||
    /\/image\/upload\//i.test(url) ||
    /cloudinary/i.test(url) ||
    /res\.cloudinary\.com/i.test(url)
  ) {
    return 'image'
  }
  if (/\.pdf$/.test(path)) return 'pdf'
  if (/\.(mp4|webm|ogg|mov)$/.test(path)) return 'video'
  if (/\.(mp3|wav|m4a)$/.test(path)) return 'audio'
  return 'document'
}

function fileNameFromUrl(url: string) {
  try {
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '')
    return name || 'Attachment'
  } catch {
    return 'Attachment'
  }
}

export interface FilePreviewModalProps {
  opened: boolean
  onClose: () => void
  url: string | null
  title?: string
  preferImage?: boolean
  contentType?: string | null
}

export function FilePreviewModal({
  opened,
  onClose,
  url,
  title,
  preferImage,
  contentType,
}: FilePreviewModalProps) {
  const kind = url ? getFileKind(url, preferImage, contentType) : 'document'
  const heading = title || (url ? fileNameFromUrl(url) : 'Attachment')

  return (
    <Modal
      opened={opened && Boolean(url)}
      onClose={onClose}
      centered
      size="xl"
      radius="lg"
      title={heading}
      overlayProps={{ backgroundOpacity: 0.5, blur: 8 }}
      styles={{
        title: { fontWeight: 700, fontSize: 16 },
        body: { paddingTop: 8 },
      }}
    >
      <Stack gap="md">
        {url && kind === 'image' ? (
          <Box className="media-zoom overflow-hidden rounded-lg bg-[var(--kura-bg-muted,#F5F8FA)]">
            <RevealImage
              src={url}
              alt={heading}
              fit="contain"
              mah={520}
              w="100%"
            />
          </Box>
        ) : null}

        {url && (kind === 'pdf' || kind === 'document') ? (
          <Box
            className="overflow-hidden rounded-lg bg-[var(--kura-bg-muted,#F5F8FA)]"
            h={{ base: 360, sm: 520 }}
          >
            <iframe title={heading} src={url} className="h-full w-full border-0" />
          </Box>
        ) : null}

        {url && kind === 'video' ? (
          <video src={url} controls className="w-full rounded-lg" />
        ) : null}

        {url && kind === 'audio' ? (
          <audio src={url} controls className="w-full" />
        ) : null}

        <Group justify="space-between" wrap="wrap" gap="sm">
          <Text fz="xs" c="dimmed">
            Preview works with Cloudinary and direct file links.
          </Text>
          {url ? (
            <Group gap="xs">
              <Button
                component="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                size="compact-sm"
                color="brand"
              >
                Open
              </Button>
              <Button
                component="a"
                href={url}
                download
                variant="subtle"
                size="compact-sm"
                color="brand"
              >
                Download
              </Button>
            </Group>
          ) : null}
        </Group>
      </Stack>
    </Modal>
  )
}
