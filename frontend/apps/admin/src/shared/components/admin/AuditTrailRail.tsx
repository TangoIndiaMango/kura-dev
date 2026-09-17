const TONE: Record<'success' | 'danger' | 'warning' | 'pending' | 'info', string> = {
  success: 'text-[#1E8E4E]',
  danger: 'text-[#C0392B]',
  warning: 'text-[#C47D0E]',
  pending: 'text-[var(--mu)]',
  info: 'text-[var(--pr)]',
}

const LINE: Record<'success' | 'danger' | 'warning' | 'pending' | 'info', string> = {
  success: 'bg-[#1E8E4E]',
  danger: 'bg-[#C0392B]',
  warning: 'bg-[#C47D0E]',
  pending: 'bg-[var(--bd)]',
  info: 'bg-[var(--pr)]',
}

const HEADER: Record<'success' | 'danger' | 'warning' | 'neutral', string> = {
  success: 'border-[#1E8E4E]/40 bg-[#E8F7EE] text-[#1E8E4E]',
  danger: 'border-[var(--er)]/40 bg-[var(--tr)] text-[#C0392B]',
  warning: 'border-[#C47D0E]/40 bg-[var(--ta)] text-[#C47D0E]',
  neutral: 'border-[var(--bd)] bg-[var(--sf)] text-[var(--tx)]',
}

export type AuditTrailTone = 'success' | 'danger' | 'warning' | 'pending' | 'info'

export type AuditTrailItem = {
  id: string
  name: string
  role: string
  verification: string
  verificationTone: AuditTrailTone
  action: string
  actionTone: AuditTrailTone
  at?: string
  initials: string
  avatarUrl?: string
}

export function AuditTrailRail({
  title,
  alertTone = 'neutral',
  items,
  emptyLabel = 'No events yet',
  className,
  maxHeight = 'min(32rem, calc(100vh - 12rem))',
}: {
  title: string
  alertTone?: 'danger' | 'warning' | 'success' | 'neutral'
  items: AuditTrailItem[]
  emptyLabel?: string
  className?: string
  maxHeight?: string | number
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5 ${className ?? ''}`}
      style={{ maxHeight }}
    >
      <div
        className={`mb-4 shrink-0 rounded-[10px] border px-3.5 py-3 text-[13.5px] font-bold ${HEADER[alertTone]}`}
      >
        {title}
      </div>

      {items.length === 0 ? (
        <p className="shrink-0 text-[12.5px] text-[var(--mu)]">{emptyLabel}</p>
      ) : (
        <ol className="relative m-0 min-h-0 flex-1 list-none space-y-0 overflow-y-auto overscroll-contain p-0 pr-1">
          {items.map((item, i) => {
            const next = items[i + 1]
            const lineTone: AuditTrailTone = next
              ? next.verificationTone === 'danger' || next.actionTone === 'danger'
                ? 'danger'
                : next.verificationTone === 'warning' || next.actionTone === 'warning'
                  ? 'warning'
                  : next.verificationTone === 'success'
                    ? 'success'
                    : item.verificationTone === 'success'
                      ? 'success'
                      : 'pending'
              : 'pending'
            return (
              <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
                {i < items.length - 1 ? (
                  <span
                    className={`absolute left-[17px] top-10 h-[calc(100%-2.25rem)] w-0.5 ${LINE[lineTone]}`}
                    aria-hidden
                  />
                ) : null}
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt=""
                    className="relative z-[1] h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--pr)] text-[11px] font-bold text-white">
                    {item.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13.5px] font-bold text-[var(--tx)]">{item.name}</p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--pr)]">
                    {item.role}
                  </p>
                  <p className={`mt-2 text-[12.5px] font-semibold ${TONE[item.verificationTone]}`}>
                    {item.verification}
                  </p>
                  <p className={`mt-1 text-[12.5px] font-semibold ${TONE[item.actionTone]}`}>
                    Action: {item.action}
                  </p>
                  {item.at ? (
                    <p className="mt-1 text-[11.5px] text-[var(--mu)]">{item.at}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
