import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy01Icon, Tick01Icon } from 'hugeicons-react'
import { Text } from '@mantine/core'
import { swapShortCode } from './types'

type RefRow = {
  label: string
  id: string
  href?: string
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function RefChip({ row }: { row: RefRow }) {
  const [copied, setCopied] = useState(false)
  const short = swapShortCode(row.id)

  const onCopy = async () => {
    const ok = await copyText(row.id)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="m-0 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
          {row.label}
        </p>
        {row.href ? (
          <Link
            to={row.href}
            className="mt-0.5 inline-block font-mono text-[13px] font-bold text-[var(--pr)] no-underline hover:underline"
            title={row.id}
          >
            {short}
          </Link>
        ) : (
          <p
            className="m-0 mt-0.5 font-mono text-[13px] font-bold text-[var(--tx)]"
            title={row.id}
          >
            {short}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--mu)] hover:bg-[var(--sf)] hover:text-[var(--tx)]"
        aria-label={`Copy full ${row.label}`}
      >
        {copied ? <Tick01Icon size={14} /> : <Copy01Icon size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

/** Compact short refs + copy full UUID — not a raw ID dump. */
export function SwapDetailRefs({
  swapId,
  accountId,
  paymentId,
  clientEventId,
  overrideId,
}: {
  swapId: string
  accountId: string
  paymentId?: string | null
  clientEventId?: string | null
  overrideId?: string | null
}) {
  const rows: RefRow[] = [
    { label: 'Swap', id: swapId },
    {
      label: 'Operator account',
      id: accountId,
      href: `/operators/${accountId}`,
    },
  ]
  if (paymentId) {
    rows.push({
      label: 'Payment',
      id: paymentId,
      href: `/payments/${paymentId}`,
    })
  }
  if (clientEventId) {
    rows.push({ label: 'Client event', id: clientEventId })
  }
  if (overrideId) {
    rows.push({ label: 'Override', id: overrideId })
  }

  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
      <Text fw={700} size="sm" className="mb-1 text-[var(--tx)]">
        References
      </Text>
      <p className="mb-3 text-[12px] text-[var(--mu)]">
        Short codes for ops. Copy for the full ID when support needs it.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">{rows.map((row) => (
        <RefChip key={`${row.label}-${row.id}`} row={row} />
      ))}</div>
    </section>
  )
}
