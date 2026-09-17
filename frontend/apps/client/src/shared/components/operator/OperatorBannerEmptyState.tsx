import React from 'react'

interface OperatorBannerEmptyStateProps {
  image: string
  badge?: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  footnote?: string
}

/** Hero-art empty state matching the credit offers card treatment. */
export const OperatorBannerEmptyState: React.FC<
  OperatorBannerEmptyStateProps
> = ({ image, badge, title, description, actionLabel, onAction, footnote }) => (
  <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] shadow-[0_12px_40px_-24px_rgba(13,124,143,0.55)]">
    <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#003153] via-[#0a4a5c] to-[#0D7C8F]">
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-95"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--kura-bg-elevated)] via-transparent to-black/20" />
      {badge ? (
        <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          {badge}
        </span>
      ) : null}
    </div>

    <div className="relative -mt-2 px-4 pb-4 pt-1">
      <h3 className="text-[15px] font-bold tracking-tight text-[var(--kura-text)]">
        {title}
      </h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--kura-muted)]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 w-full rounded-xl bg-[var(--kura-amber)] px-4 py-3 text-[14px] font-extrabold text-[#1a1204]"
        >
          {actionLabel}
        </button>
      ) : null}
      {footnote ? (
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-[var(--kura-muted)]">
          {footnote}
        </p>
      ) : null}
    </div>
  </section>
)
