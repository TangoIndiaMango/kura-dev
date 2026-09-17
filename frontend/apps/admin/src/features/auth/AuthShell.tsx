import type { ReactNode } from 'react'
import { KuraLogo } from '@shared/components'

/**
 * Kura Admin auth shell — Kasa Ops composition with official KURA mark.
 */
export function AuthShell({
  children,
  line = 'Hubs, swaps, riders, one operations console.',
  footer,
}: {
  children: ReactNode
  line?: string
  footer?: ReactNode
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#061018]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_18%,rgba(13,124,143,0.28),transparent_48%),radial-gradient(ellipse_at_88%_78%,rgba(47,190,207,0.1),transparent_42%),linear-gradient(130deg,#061018_0%,#0b1c24_48%,#051016_100%)]" />
        <img
          src="/illustrations/swap-complete.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] opacity-[0.18]"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[rgba(6,16,24,0.55)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(6,16,24,0.72)_0%,rgba(6,16,24,0.42)_50%,rgba(6,16,24,0.28)_100%)]" />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col justify-center gap-9 px-5 py-10 sm:px-8 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-12 lg:py-14 xl:px-16">
        <div className="max-w-[26rem] shrink-0 text-white [text-shadow:0_1px_24px_rgba(0,0,0,0.35)] animate-[kuraAuthIn_0.55s_ease-out]">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
            Ops Console
          </p>
          <div className="mt-5 mb-3">
            <KuraLogo size="lg" subtitle="Admin" />
          </div>
          <p className="mt-5 max-w-[22rem] text-[15px] leading-snug text-white/76 sm:text-[16.5px]">
            {line}
          </p>
          <div className="mt-5 h-px w-12 bg-white/30" aria-hidden />
        </div>

        <div className="w-full max-w-[480px] shrink-0 animate-[kuraAuthIn_0.5s_ease-out] rounded-[18px] border border-white/[0.11] bg-[var(--sf)] p-6 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.5)] sm:p-8">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <img
              src="/brand/kura-mark.png"
              alt="KURA"
              width={32}
              height={32}
              className="rounded-[8px] bg-[#050b10] object-contain p-0.5"
            />
            <span className="text-[15px] font-bold tracking-[0.06em] text-[var(--tx)]">
              KURA Admin
            </span>
          </div>
          {children}
          {footer ? (
            <div className="mt-6 border-t border-[var(--bd)] pt-4 text-center text-[13px] text-[var(--mu)]">
              {footer}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes kuraAuthIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[kuraAuthIn_0\\.55s_ease-out\\],
          .animate-\\[kuraAuthIn_0\\.5s_ease-out\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export function AuthShellSkeleton() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#061018]">
      <div className="absolute inset-0 bg-[linear-gradient(130deg,#061018,#0b1c24,#051016)]" />
      <div className="relative z-[1] mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col justify-center gap-9 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="max-w-[26rem]">
          <div className="h-3 w-28 animate-pulse rounded bg-white/20" />
          <div className="mt-5 h-14 w-48 animate-pulse rounded-lg bg-white/25" />
          <div className="mt-6 h-4 w-52 animate-pulse rounded bg-white/15" />
        </div>
        <div className="w-full max-w-[480px] space-y-4 rounded-[18px] bg-[var(--sf)] p-8">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-[var(--in)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--in)]" />
          <div className="mt-4 space-y-3">
            <div className="h-11 animate-pulse rounded-lg bg-[var(--in)]" />
            <div className="h-11 animate-pulse rounded-lg bg-[var(--in)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
