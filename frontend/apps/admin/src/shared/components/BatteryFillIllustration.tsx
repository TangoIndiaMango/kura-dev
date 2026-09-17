import { useId } from 'react'

/**
 * Battery illustration — body fill rises with charge %.
 * Shared by hub bay board and battery pack detail.
 */
export function BatteryFillIllustration({
  pct,
  color,
  empty = false,
  size = 'md',
}: {
  pct: number | null
  color: string
  empty?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const clipId = useId().replace(/:/g, '')
  const fill = empty || pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const dims =
    size === 'lg' ? { h: 128, w: 72 } : size === 'sm' ? { h: 72, w: 42 } : { h: 96, w: 56 }
  const wellX = 10
  const wellY = 18
  const wellW = 36
  const wellH = 78
  const fillH = (wellH * fill) / 100
  const fillY = wellY + wellH - fillH

  return (
    <svg
      viewBox="0 0 56 112"
      width={dims.w}
      height={dims.h}
      className="shrink-0"
      aria-hidden
    >
      <rect
        x="20"
        y="2"
        width="16"
        height="10"
        rx="2.5"
        fill={empty ? '#C5D0D6' : color}
        opacity={empty ? 0.55 : 0.9}
      />
      <rect
        x="4"
        y="12"
        width="48"
        height="92"
        rx="10"
        fill="var(--sf)"
        stroke={empty ? '#C5D0D6' : color}
        strokeWidth="2.5"
        opacity={empty ? 0.7 : 1}
      />
      <rect x={wellX} y={wellY} width={wellW} height={wellH} rx="6" fill="var(--in)" />
      <defs>
        <clipPath id={clipId}>
          <rect x={wellX} y={wellY} width={wellW} height={wellH} rx="6" />
        </clipPath>
        <linearGradient id={`${clipId}-grad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.92" />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect
          x={wellX}
          y={fillY}
          width={wellW}
          height={Math.max(fillH, fill > 0 ? 2 : 0)}
          fill={`url(#${clipId}-grad)`}
        />
        {fill > 8 ? (
          <rect
            x={wellX + 4}
            y={fillY + 3}
            width={8}
            height={Math.min(fillH - 6, 28)}
            rx="3"
            fill="rgba(255,255,255,0.28)"
          />
        ) : null}
      </g>
      <text
        x="28"
        y="62"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={empty ? '#93A7B0' : fill >= 45 ? '#FFFFFF' : 'var(--tx)'}
        fontSize="13"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {empty || pct == null ? '—' : `${Math.round(pct)}%`}
      </text>
    </svg>
  )
}
