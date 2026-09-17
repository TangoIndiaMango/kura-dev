import React from 'react'
import {
  Alert01Icon,
  ArrowReloadHorizontalIcon,
  CircleArrowDown02Icon,
  DollarCircleIcon,
  RefreshIcon,
} from 'hugeicons-react'

export type ActivityIconKind =
  | 'swap'
  | 'funded'
  | 'loan'
  | 'plan'
  | 'declined'
  | 'debit'

const STYLES: Record<
  ActivityIconKind,
  { bg: string; fg: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  swap: {
    bg: 'bg-[var(--kura-green)]/15',
    fg: 'text-[var(--kura-green)]',
    Icon: ArrowReloadHorizontalIcon,
  },
  funded: {
    bg: 'bg-[var(--kura-green)]/15',
    fg: 'text-[var(--kura-green)]',
    Icon: CircleArrowDown02Icon,
  },
  loan: {
    bg: 'bg-[var(--kura-amber)]/15',
    fg: 'text-[var(--kura-amber)]',
    Icon: DollarCircleIcon,
  },
  plan: {
    bg: 'bg-[var(--kura-teal)]/15',
    fg: 'text-[var(--kura-teal-bright)]',
    Icon: RefreshIcon,
  },
  declined: {
    bg: 'bg-[var(--kura-coral)]/15',
    fg: 'text-[var(--kura-coral)]',
    Icon: Alert01Icon,
  },
  debit: {
    bg: 'bg-[var(--kura-amber)]/15',
    fg: 'text-[var(--kura-amber)]',
    Icon: DollarCircleIcon,
  },
}

export function activityIconFromTitle(title: string): ActivityIconKind {
  const t = title.toLowerCase()
  if (t.includes('declined')) return 'declined'
  if (t.includes('swap') || t.includes('pay-per-swap')) return 'swap'
  if (t.includes('funded') || t.includes('fund')) return 'funded'
  if (t.includes('loan') || t.includes('repay')) return 'loan'
  if (t.includes('plan') || t.includes('renew')) return 'plan'
  return 'debit'
}

interface ActivityTypeIconProps {
  kind: ActivityIconKind
  size?: 'sm' | 'md'
}

export const ActivityTypeIcon: React.FC<ActivityTypeIconProps> = ({
  kind,
  size = 'md',
}) => {
  const { bg, fg, Icon } = STYLES[kind]
  const box = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 16 : 18

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${box} ${bg} ${fg}`}
      aria-hidden
    >
      <Icon size={iconSize} />
    </span>
  )
}
