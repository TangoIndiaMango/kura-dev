import React from 'react'

interface CreditOffersComingSoonCardProps {
  loading?: boolean
}

export function CreditOffersComingSoonCard({
  loading = false,
}: CreditOffersComingSoonCardProps) {
  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
        <div className="h-36 animate-pulse bg-[var(--kura-border)]/30" />
        <div className="space-y-2 px-4 py-4">
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--kura-border)]/40" />
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--kura-border)]/40" />
          <div className="h-3 w-full animate-pulse rounded bg-[var(--kura-border)]/30" />
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] shadow-[0_12px_40px_-24px_rgba(13,124,143,0.55)]">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#003153] via-[#0a4a5c] to-[#0D7C8F]">
        <img
          src="/illustrations/credit-offers-coming-soon.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-95"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--kura-bg-elevated)] via-transparent to-black/20" />
        <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md">
        Coming soon
        </span>
      </div>

      <div className="relative -mt-2 px-4 pb-4 pt-1">
        <h3 className="text-[15px] font-bold tracking-tight text-[var(--kura-text)]">
          Swap credit & product offers
        </h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--kura-muted)]">
          Borrow for battery swaps and unlock partner deals when your account
          qualifies.
        </p>
      </div>
    </section>
  )
}
