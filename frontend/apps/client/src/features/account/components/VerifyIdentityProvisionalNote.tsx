import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'

export function VerifyIdentityProvisionalNote({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title="Identity" onBack={onBack} />
      <p className="rounded-2xl border border-[var(--kura-teal)]/35 bg-[var(--kura-teal)]/10 px-4 py-4 text-[13px] leading-relaxed text-[var(--kura-text)]">
        Hub provisional access. Full verification still pending — attach ID photos in
        Account if ops asks.
      </p>
    </div>
  )
}
