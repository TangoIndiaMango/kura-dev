import { FileDownloadIcon } from 'hugeicons-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { formatNaira } from '@shared/utils/currency'
import {
  paymentDateParts,
  paymentReceiptIllustration,
  paymentStatusLabel,
  paymentStatusTone,
  shortPaymentRef,
} from './paymentDetailHelpers'

const PILL: Record<ReturnType<typeof paymentStatusTone>, string> = {
  success: 'bg-[#1E8E4E] text-white',
  warning: 'bg-[#C47D0E] text-white',
  danger: 'bg-[#C0392B] text-white',
  info: 'bg-[var(--pr)] text-white',
}

export type PaymentReceiptView = {
  reference: string
  accountId: string
  accountLabel?: string
  amountKobo: number
  channel: string
  purpose: string
  status: string
  createdAt: string
}

export function PaymentReceiptCard({
  record,
  onDownload,
  extraRows = [],
}: {
  record: PaymentReceiptView
  onDownload: () => void
  extraRows?: { label: string; value: string }[]
}) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'light' ? 'light' : 'dark'
  const tone = paymentStatusTone(record.status)
  const { dateLabel, timeLabel } = paymentDateParts(record.createdAt)
  const accountShort =
    record.accountLabel || shortPaymentRef(record.accountId)
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Account',
      value: (
        <Link
          to={`/operators/${record.accountId}`}
          className="font-mono font-bold text-[var(--pr)] no-underline hover:underline"
          title={record.accountId}
        >
          {accountShort}
        </Link>
      ),
    },
    { label: 'Receipt', value: record.reference },
    { label: 'Date', value: dateLabel },
    { label: 'Time', value: timeLabel },
    { label: 'Type', value: record.purpose },
    { label: 'Paid via', value: record.channel },
    ...extraRows,
  ]

  return (
    <article className="w-full overflow-hidden rounded-[16px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
      <div className="flex items-center gap-4 border-b border-[var(--bd)] px-5 py-4">
        <img
          src={illustrationSrc(paymentReceiptIllustration(record.status), themeKey)}
          alt=""
          className="h-14 w-14 shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[26px] font-extrabold tabular-nums leading-none text-[var(--tx)]">
            {formatNaira(record.amountKobo, { fromKobo: true })}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PILL[tone]}`}
          >
            {paymentStatusLabel(record.status)}
          </span>
        </div>
      </div>

      <dl className="space-y-2.5 px-5 py-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 text-[13px]"
          >
            <dt className="shrink-0 text-[var(--mu)]">{row.label}</dt>
            <dd className="m-0 min-w-0 truncate text-right font-semibold text-[var(--tx)]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-[var(--bd)] px-5 py-3">
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--pr)]"
        >
          <FileDownloadIcon size={16} />
          Download receipt CSV
        </button>
      </div>
    </article>
  )
}
