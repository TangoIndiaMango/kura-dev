import React, { useEffect, useState } from 'react'
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from 'framer-motion'
import { ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react'
import type { OperatorVehicle } from '../../../shared/session'
import { BatteryCard, EmptyBatteryHero } from './BatteryHeroCard'

/** Framer Motion carousel — drag + spring snap */
export function BatteryHeroWithSwitcher({
  vehicles,
  onBookSwap,
  onAddVehicle,
  loading = false,
}: {
  vehicles: OperatorVehicle[]
  onBookSwap: () => void
  onAddVehicle?: () => void
  loading?: boolean
}) {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState(0)
  const x = useMotionValue(0)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  const count = vehicles.length
  const safeIndex = Math.min(index, Math.max(0, count - 1))

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setWidth(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [count])

  useEffect(() => {
    if (!width) return
    animate(x, -safeIndex * width, {
      type: 'spring',
      stiffness: 320,
      damping: 36,
      mass: 0.85,
    })
  }, [safeIndex, width, x])

  const goTo = (next: number) => {
    if (count === 0) return
    setIndex(Math.max(0, Math.min(count - 1, next)))
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!width) return
    const offset = info.offset.x
    const velocity = info.velocity.x
    const threshold = width * 0.18
    if (offset < -threshold || velocity < -450) goTo(safeIndex + 1)
    else if (offset > threshold || velocity > 450) goTo(safeIndex - 1)
    else goTo(safeIndex)
  }

  if (loading && count === 0) {
    return (
      <div className="h-[200px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
    )
  }

  if (count === 0) {
    return (
      <EmptyBatteryHero onBookSwap={onBookSwap} onAddVehicle={onAddVehicle} />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={viewportRef}
        className="overflow-hidden rounded-[1.35rem]"
        style={{ touchAction: 'pan-y' }}
      >
        <motion.div
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x }}
          drag={count > 1 ? 'x' : false}
          dragConstraints={
            width
              ? { left: -(count - 1) * width, right: 0 }
              : { left: 0, right: 0 }
          }
          dragElastic={0.18}
          onDragEnd={onDragEnd}
        >
          {vehicles.map((vehicle, i) => (
            <div
              key={vehicle.id}
              className="shrink-0 grow-0"
              style={{ width: width || '100%' }}
            >
              <BatteryCard
                vehicle={vehicle}
                onBookSwap={onBookSwap}
                active={i === safeIndex}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {count > 1 ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <button
            type="button"
            aria-label="Previous vehicle"
            disabled={safeIndex === 0}
            onClick={() => goTo(safeIndex - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] text-[var(--kura-text)] disabled:opacity-30"
          >
            <ArrowLeft01Icon size={18} />
          </button>
          <div className="flex items-center gap-1.5">
            {vehicles.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.short}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === safeIndex
                    ? 'w-5 bg-[var(--kura-teal-bright)]'
                    : 'w-1.5 bg-[var(--kura-border)]'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next vehicle"
            disabled={safeIndex === count - 1}
            onClick={() => goTo(safeIndex + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] text-[var(--kura-text)] disabled:opacity-30"
          >
            <ArrowRight01Icon size={18} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
