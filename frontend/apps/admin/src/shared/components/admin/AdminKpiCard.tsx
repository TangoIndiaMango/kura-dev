import type { ReactNode } from 'react'

export type AdminKpiTone = 'default' | 'success' | 'warning' | 'danger'

export interface AdminKpiCardProps {
  title: string
  value: ReactNode
  sub?: ReactNode
  tone?: AdminKpiTone
  className?: string
}

const TONE_STYLES: Record<
  AdminKpiTone,
  { shell: string; value: string; sub: string }
> = {
  default: {
    shell: 'border-l-[3px] border-l-[var(--bd)] bg-[var(--tn)]',
    value: 'text-[var(--tx)]',
    sub: 'text-[var(--mu)]',
  },
  success: {
    shell: 'border-l-[3px] border-l-[#27AE60] bg-[#E3F7EB] dark:bg-[var(--tg)]',
    value: 'text-[#1E8E4E] dark:text-[#5CDB95]',
    sub: 'text-[#1E8E4E] dark:text-[#5CDB95]',
  },
  warning: {
    shell: 'border-l-[3px] border-l-[#F5A623] bg-[#FFF1D6] dark:bg-[var(--ta)]',
    value: 'text-[#9A6700] dark:text-[#F5C86A]',
    sub: 'text-[#9A6700] dark:text-[#F5C86A]',
  },
  danger: {
    shell: 'border-l-[3px] border-l-[#E74C3C] bg-[#FDE4E1] dark:bg-[var(--tr)]',
    value: 'text-[#C0392B] dark:text-[#F08078]',
    sub: 'text-[#C0392B] dark:text-[#F08078]',
  },
}

export function AdminKpiCard({
  title,
  value,
  sub,
  tone = 'default',
  className = '',
}: AdminKpiCardProps) {
  const styles = TONE_STYLES[tone]

  return (
    <div
      className={`flex min-h-[96px] flex-col gap-2 rounded-[10px] p-4 sm:p-[16px_18px] ${styles.shell} ${className}`}
    >
      <div className="text-[13px] font-medium text-[var(--mu)]">{title}</div>
      <div
        className={`text-[26px] font-bold leading-none tracking-tight ${styles.value}`}
      >
        {value}
      </div>
      {sub != null ? (
        <div className={`text-[11.5px] font-semibold ${styles.sub}`}>{sub}</div>
      ) : null}
    </div>
  )
}
