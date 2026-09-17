import React, { useEffect, useRef, useState } from 'react'

interface HoldFillButtonProps {
  children: React.ReactNode
  onComplete: () => void
  /** Hold duration in ms before firing */
  durationMs?: number
  disabled?: boolean
  tone?: 'teal' | 'amber' | 'danger'
  fullWidth?: boolean
  className?: string
  hint?: string
}

/**
 * Native-app style confirm: press and hold while the fill grows to completion.
 * Releases early cancel the action.
 */
export const HoldFillButton: React.FC<HoldFillButtonProps> = ({
  children,
  onComplete,
  durationMs = 900,
  disabled = false,
  tone = 'teal',
  fullWidth = true,
  className = '',
  hint = 'Hold to confirm',
}) => {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)

  const rafRef = useRef<number | null>(null)
  const resetTimerRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const activeRef = useRef(false)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const durationRef = useRef(durationMs)
  const pointerIdRef = useRef<number | null>(null)

  onCompleteRef.current = onComplete
  durationRef.current = durationMs

  const fillClass =
    tone === 'danger'
      ? 'bg-[var(--kura-coral)]'
      : tone === 'amber'
        ? 'bg-[var(--kura-amber)]'
        : 'bg-[var(--kura-teal)]'

  const idleClass =
    tone === 'danger'
      ? 'border-[var(--kura-coral)]/50 text-[var(--kura-coral)]'
      : tone === 'amber'
        ? 'border-[var(--kura-amber)]/50 text-[var(--kura-amber)]'
        : 'border-[var(--kura-teal)]/55 text-[var(--kura-teal-bright)]'

  const clearRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const clearResetTimer = () => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }

  const resetVisual = () => {
    setProgress(0)
    setHolding(false)
  }

  const abortHold = () => {
    clearRaf()
    activeRef.current = false
    completedRef.current = false
    pointerIdRef.current = null
    resetVisual()
  }

  useEffect(() => {
    return () => {
      clearRaf()
      clearResetTimer()
    }
  }, [])

  const tick = () => {
    if (!activeRef.current || completedRef.current) return

    const elapsed = performance.now() - startRef.current
    const next = Math.min(1, elapsed / durationRef.current)
    setProgress(next)

    if (next >= 1) {
      completedRef.current = true
      activeRef.current = false
      clearRaf()
      setHolding(false)
      setProgress(1)
      onCompleteRef.current()
      clearResetTimer()
      resetTimerRef.current = window.setTimeout(() => {
        completedRef.current = false
        pointerIdRef.current = null
        resetVisual()
        resetTimerRef.current = null
      }, 200)
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const releasePointer = (target: HTMLButtonElement) => {
    const id = pointerIdRef.current
    if (id == null) return
    try {
      if (target.hasPointerCapture?.(id)) {
        target.releasePointerCapture(id)
      }
    } catch {
      /* already released */
    }
    pointerIdRef.current = null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return
    // Ignore extra pointers while one hold is active
    if (activeRef.current) return

    clearRaf()
    clearResetTimer()
    completedRef.current = false
    activeRef.current = true
    pointerIdRef.current = e.pointerId
    startRef.current = performance.now()
    setHolding(true)
    setProgress(0)

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture unsupported — still track via pointerup on window-ish path */
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return
    }
    releasePointer(e.currentTarget)
    if (completedRef.current) return
    if (activeRef.current) abortHold()
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return
    }
    releasePointer(e.currentTarget)
    if (completedRef.current) return
    if (activeRef.current) abortHold()
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className={[
          'relative isolate overflow-hidden rounded-xl border px-4 py-3.5 text-[15px] font-bold tracking-wide select-none touch-none transition disabled:opacity-50',
          idleClass,
          'bg-[var(--kura-bg-elevated)]',
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={typeof children === 'string' ? `${children}. ${hint}` : hint}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 z-0 ${fillClass}`}
          style={{
            width: `${progress * 100}%`,
            opacity: holding || progress > 0 ? 1 : 0,
          }}
        />
        <span
          className={`relative z-10 ${
            progress > 0.45
              ? tone === 'amber'
                ? 'text-[#003153]'
                : 'text-white'
              : ''
          }`}
        >
          {holding ? hint : children}
        </span>
      </button>
    </div>
  )
}
