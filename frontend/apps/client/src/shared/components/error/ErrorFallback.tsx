import { Alert02Icon } from 'hugeicons-react'
import { Link } from 'react-router-dom'
import { getErrorDetails, getErrorMessage, getErrorTitle } from './error.utils'

export interface ErrorFallbackProps {
  error?: unknown
  title?: string
  message?: string
  homeTo?: string
  homeLabel?: string
  showReload?: boolean
  onReset?: () => void
}

/** Full-viewport recovery UI — theme-safe for operator dark/light. */
export function ErrorFallback({
  error,
  title,
  message,
  homeTo = '/',
  homeLabel = 'Back to home',
  showReload = true,
  onReset,
}: ErrorFallbackProps) {
  const resolvedTitle = title ?? getErrorTitle(error)
  const resolvedMessage = message ?? getErrorMessage(error)
  const details = import.meta.env.DEV ? getErrorDetails(error) : undefined

  return (
    <div className="flex min-h-[70dvh] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kura-coral)]/15 text-[var(--kura-coral)]">
          <Alert02Icon size={28} />
        </div>
        <h1 className="text-center text-[20px] font-bold tracking-tight text-[var(--kura-text)]">
          {resolvedTitle}
        </h1>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-[var(--kura-muted)]">
          {resolvedMessage}
        </p>
        <p className="mt-1 text-center text-[12px] text-[var(--kura-muted)]">
          Your data is safe. Try again or head back.
        </p>

        {details ? (
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-[var(--kura-border-subtle)] bg-[var(--kura-bg)] p-3 text-[10px] leading-relaxed text-[var(--kura-muted)]">
            {details}
          </pre>
        ) : null}

        <div className="mt-5 flex flex-col gap-2.5">
          {showReload ? (
            <button
              type="button"
              onClick={() => {
                onReset?.()
                window.location.reload()
              }}
              className="w-full rounded-xl bg-[var(--kura-teal)] py-3.5 text-[14px] font-bold text-[var(--kura-text-inverse)]"
            >
              Reload page
            </button>
          ) : null}
          {onReset && !showReload ? (
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl bg-[var(--kura-teal)] py-3.5 text-[14px] font-bold text-[var(--kura-text-inverse)]"
            >
              Try again
            </button>
          ) : null}
          <Link
            to={homeTo}
            className="block w-full rounded-xl border border-[var(--kura-border)] py-3.5 text-center text-[14px] font-bold text-[var(--kura-text)]"
            onClick={() => onReset?.()}
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
