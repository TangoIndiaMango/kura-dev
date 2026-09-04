import { Badge } from '@mantine/core'

type TableStatusTone =
  | 'success'
  | 'brand'
  | 'pending'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

const TONE_STYLES: Record<
  TableStatusTone,
  { bg: string; color: string }
> = {
  success: { bg: 'var(--mantine-color-brand-0)', color: 'var(--mantine-color-brand-7)' },
  brand: { bg: 'var(--mantine-color-brand-0)', color: 'var(--mantine-color-brand-7)' },
  pending: { bg: '#FFFAEB', color: '#B54708' },
  warning: { bg: '#FFFAEB', color: '#B54708' },
  danger: { bg: '#FEF3F2', color: '#B42318' },
  info: { bg: '#EFF8FF', color: '#175CD3' },
  neutral: { bg: '#F2F4F7', color: '#344054' },
}

interface TableStatusBadgeProps {
  label: string
  tone?: TableStatusTone
}

export function TableStatusBadge({
  label,
  tone = 'neutral',
}: TableStatusBadgeProps) {
  const styles = TONE_STYLES[tone]

  return (
    <Badge
      radius="xl"
      variant="light"
      bg={styles.bg}
      c={styles.color}
      fz={12}
      fw={500}
      tt="none"
    >
      {label}
    </Badge>
  )
}
