/** Honest label when a surface still uses session/mock data, not live APIs. */
export function DemoDataBanner({
  module,
  detail,
}: {
  module: string
  detail?: string
}) {
  return (
    <div
      role="status"
      className="rounded-[10px] border border-[var(--bd)] bg-[var(--tn)] px-3.5 py-2.5 text-[12.5px] leading-snug text-[var(--mu)]"
    >
      <span className="font-semibold text-[var(--tx)]">{module}</span>
      {' · '}
      {detail ??
        'Preview / demo data — not wired to live APIs yet. Do not use for ops decisions.'}
    </div>
  )
}
