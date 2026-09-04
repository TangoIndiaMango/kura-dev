import { Anchor, Group } from '@mantine/core'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { Link } from 'react-router-dom'

export interface GoBackLinkProps {
  to: string
  label?: string
}

export function GoBackLink({ to, label = 'Go Back' }: GoBackLinkProps) {
  return (
    <Anchor
      component={Link}
      to={to}
      c="gray.7"
      fz="sm"
      td="none"
      className="inline-flex w-fit items-center gap-2"
    >
      <Group gap={8} wrap="nowrap">
        <ArrowLeft01Icon size={16} />
        {label}
      </Group>
    </Anchor>
  )
}
