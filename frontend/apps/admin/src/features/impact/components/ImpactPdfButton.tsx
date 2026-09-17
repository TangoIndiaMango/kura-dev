import { useState } from 'react'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { FileDownloadIcon } from 'hugeicons-react'
import { downloadImpactPdf } from '../hooks/use-impact'

type Props = {
  period?: string
}

export function ImpactPdfButton({ period }: Props) {
  const [pending, setPending] = useState(false)

  return (
    <Button
      variant="default"
      leftSection={<FileDownloadIcon size={16} />}
      loading={pending}
      disabled={pending}
      onClick={() => {
        setPending(true)
        downloadImpactPdf(period)
          .then(() => {
            notifications.show({
              color: 'teal',
              message: 'Impact PDF downloaded.',
            })
          })
          .catch((err: unknown) => {
            notifications.show({
              color: 'red',
              message:
                err instanceof Error
                  ? err.message
                  : 'Could not generate impact PDF.',
            })
          })
          .finally(() => setPending(false))
      }}
    >
      Download PDF
    </Button>
  )
}
