import React from 'react'

type LogoSize = 'sm' | 'md' | 'lg'

interface KuraLogoProps {
  size?: LogoSize
  className?: string
  /** Optional muted subtitle under the wordmark (e.g. Admin) */
  subtitle?: string
  /** Icon-only (no KURA wordmark) */
  iconOnly?: boolean
}

const SIZE_MAP = {
  sm: { box: 28, img: 22, text: 'text-[15px]', gap: 'gap-2', radius: 'rounded-[8px]' },
  md: { box: 34, img: 28, text: 'text-[16px]', gap: 'gap-2.5', radius: 'rounded-[9px]' },
  lg: { box: 44, img: 36, text: 'text-[22px]', gap: 'gap-3', radius: 'rounded-[12px]' },
} as const

/**
 * Brand mark uses the official PNG icon (liquid K).
 * Styled in a dark rounded tile to match operator/admin chrome.
 */
export const KuraLogo: React.FC<KuraLogoProps> = ({
  size = 'md',
  className = '',
  subtitle,
  iconOnly = false,
}) => {
  const s = SIZE_MAP[size]

  const icon = (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden bg-[#050b10] ${s.radius}`}
      style={{ width: s.box, height: s.box }}
    >
      <img
        src="/brand/kura-mark.png"
        alt=""
        width={s.img}
        height={s.img}
        className="object-contain"
        aria-hidden
      />
    </span>
  )

  if (iconOnly) {
    return (
      <span className={`inline-flex ${className}`} aria-label="KURA">
        {icon}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      {icon}
      <span className="flex flex-col leading-tight">
        <span className={`font-bold tracking-[0.06em] text-white ${s.text}`}>
          KURA
        </span>
        {subtitle ? (
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#C9D9E3]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  )
}
