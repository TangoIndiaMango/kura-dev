import { Card } from '@mantine/core'
import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

interface EmptySectionProps {
  title?: string
  description?: string
  icon?: ReactNode
  /** primary wraps in a card; secondary renders inline for table containers */
  format?: 'primary' | 'secondary'
}

export function EmptySection({
  title,
  description,
  icon,
  format = 'primary',
}: EmptySectionProps) {
  if (format === 'secondary') {
    return (
      <EmptyState title={title} description={description} icon={icon} />
    )
  }

  return (
    <Card withBorder radius="md" padding="lg" bg="white">
      <EmptyState title={title} description={description} icon={icon} />
    </Card>
  )
}
