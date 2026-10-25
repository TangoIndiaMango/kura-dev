import type { ReactNode } from 'react'

/** Section shell: consistent gutters, max width and an optional heading block. */
export function Section({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`px-4 py-20 sm:px-6 md:px-10 md:py-28 lg:py-32 ${className}`}>
      <div className="mx-auto max-w-[1240px]">{children}</div>
    </section>
  )
}

export function Heading({
  kicker,
  title,
  lede,
  align = 'left',
  aside,
  invert = false,
}: {
  kicker: string
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
  aside?: ReactNode
  invert?: boolean
}) {
  const center = align === 'center'
  return (
    <div className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${center ? 'md:justify-center' : ''}`}>
      <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
        <p className={`kicker reveal ${invert ? 'text-gold' : 'text-accent'}`}>{kicker}</p>
        <h2
          className={`reveal mt-4 text-[2.4rem] font-bold sm:text-5xl lg:text-[3.6rem] ${invert ? 'text-on-inverse' : ''}`}
          style={{ ['--i' as string]: 1 }}
        >
          {title}
        </h2>
        {lede ? (
          <p
            className={`reveal mt-5 text-lg ${invert ? 'text-on-inverse-muted' : 'text-fg-muted'}`}
            style={{ ['--i' as string]: 2 }}
          >
            {lede}
          </p>
        ) : null}
      </div>
      {aside}
    </div>
  )
}

/** Accessible segmented control used for vehicle pickers. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors sm:px-5 ${
            value === o.value ? 'bg-fg text-bg shadow-card' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
