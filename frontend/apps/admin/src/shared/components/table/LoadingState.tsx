import { Card, Skeleton, Stack } from '@mantine/core'

interface LoadingStateProps {
  rows?: number
  cols?: number
  variant?: 'card' | 'inline'
}

export function LoadingState({
  rows = 5,
  cols = 4,
  variant = 'card',
}: LoadingStateProps) {
  const content = (
    <div className="space-y-4">
      <div className="flex gap-4 border-b border-[#EAECF0] py-3">
        {Array.from({ length: cols }).map((_, index) => (
          <Skeleton key={index} height={14} className="flex-1" radius="sm" />
        ))}
      </div>

      <Stack gap="md">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 py-2">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={14} className="flex-1" radius="sm" />
            ))}
          </div>
        ))}
      </Stack>
    </div>
  )

  if (variant === 'inline') {
    return <div className="p-4">{content}</div>
  }

  return (
    <Card withBorder radius="md" padding="lg" bg="white">
      {content}
    </Card>
  )
}
