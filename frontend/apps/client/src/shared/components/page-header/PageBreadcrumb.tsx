import { Anchor, Group, Text } from '@mantine/core'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { themeColors } from '@/lib/config/theme'

export interface PageBreadcrumbItem {
  label: string
  href?: string
}

interface PageBreadcrumbProps {
  items: PageBreadcrumbItem[]
}

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  return (
    <Group gap={6} wrap="wrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <Text fz="sm" c="gray.5">
                /
              </Text>
            )}
            {item.href && !isLast ? (
              <Anchor
                component={Link}
                to={item.href}
                fz="sm"
                c="gray.7"
                fw={400}
                underline="never"
              >
                {item.label}
              </Anchor>
            ) : (
              <Text
                fz="sm"
                c={isLast ? themeColors.sidebarActiveGreen : 'gray.7'}
                fw={isLast ? 500 : 400}
              >
                {item.label}
              </Text>
            )}
          </Fragment>
        )
      })}
    </Group>
  )
}
