import { Badge } from '@mantine/core'
import { themeColors } from '@/lib/config/theme'

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
  success: { bg: themeColors.lightGreenBg, color: themeColors.primaryGreen },
  brand: { bg: themeColors.lightGreenBg, color: themeColors.primaryGreen },
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
