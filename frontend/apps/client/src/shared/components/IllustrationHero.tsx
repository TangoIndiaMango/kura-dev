import React, { useState } from 'react'
import {
  illustrationHasGif,
  illustrationPngFallback,
  illustrationSrc,
  type KuraIllustrationId,
} from '../illustrations/catalog'

interface IllustrationHeroProps {
  id: KuraIllustrationId
  theme: 'dark' | 'light'
  className?: string
  imgClassName?: string
  variant?: 'auto' | 'static'
}

/** Theme-aware illustration: GIF when available, then themed PNG, then root PNG. */
export function IllustrationHero({
  id,
  theme,
  className = '',
  imgClassName = 'relative z-[1] mx-auto h-[140px] w-auto object-contain',
  variant = 'auto',
}: IllustrationHeroProps) {
  const [broken, setBroken] = useState(false)
  const themedPng = illustrationPngFallback(id, theme)
  const rootPng = `/illustrations/${id}.png`
  const isStatic = variant === 'static'
  const primary = isStatic ? themedPng : illustrationSrc(id, theme)

  if (broken) {
    return (
      <div
        className={`flex h-[140px] w-full max-w-[240px] items-center justify-center rounded-2xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg)]/40 ${className}`}
        aria-hidden
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
          KURA
        </span>
      </div>
    )
  }

  return (
    <img
      key={`${id}-${theme}-${primary}`}
      src={primary}
      alt=""
      width={240}
      height={180}
      className={imgClassName}
      onError={(e) => {
        const img = e.currentTarget
        const step = Number(img.dataset.step ?? '0')
        if (step === 0 && !isStatic && illustrationHasGif(id)) {
          img.dataset.step = '1'
          img.src = themedPng
          return
        }
        if (step <= 1) {
          img.dataset.step = '2'
          img.src = rootPng
          return
        }
        setBroken(true)
      }}
    />
  )
}
