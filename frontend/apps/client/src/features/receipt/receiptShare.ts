import type { ReceiptData } from '@shared/mock/operatorReceipt'
import { axiosInstance } from '@lib/api/client'


export function buildReceiptShareText(data: ReceiptData): string {
  const lines = [
    `Kura receipt · ${data.amountLabel}`,
    data.headline,
    ...data.rows.map((r) => `${r.label}: ${r.value}`),
  ]
  return lines.join('\n')
}

function receiptCodeFromData(data: ReceiptData): string {
  const code =
    data.rows.find((r) => /receipt code/i.test(r.label))?.value ?? data.id
  return String(code).replace(/[^a-zA-Z0-9-_]/g, '') || 'payment'
}

function filenameFromDisposition(
  header: string | undefined,
  fallback: string,
): string {
  if (!header) return fallback
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  if (plain?.[1]) return plain[1].trim()
  return fallback
}

export async function fetchReceiptPdf(
  paymentId: string,
  fallbackName: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await axiosInstance.get<Blob>(
    `/finance/payments/${paymentId}/receipt/`,
    {
      params: { as: 'pdf' },
      responseType: 'blob',
      silentError: true,
    },
  )
  const blob =
    res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: 'application/pdf' })
  if (blob.type && blob.type.includes('json')) {
    throw new Error('Receipt PDF unavailable')
  }
  const filename = filenameFromDisposition(
    res.headers['content-disposition'] as string | undefined,
    fallbackName.endsWith('.pdf') ? fallbackName : `${fallbackName}.pdf`,
  )
  return { blob, filename }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export async function downloadReceiptPdf(
  paymentId: string,
  data: ReceiptData,
): Promise<void> {
  const { blob, filename } = await fetchReceiptPdf(
    paymentId,
    `${receiptCodeFromData(data)}.pdf`,
  )
  triggerBlobDownload(blob, filename)
}

export async function shareReceipt(
  paymentId: string,
  data: ReceiptData,
): Promise<'shared' | 'copied'> {
  const text = buildReceiptShareText(data)

  try {
    const { blob, filename } = await fetchReceiptPdf(
      paymentId,
      `${receiptCodeFromData(data)}.pdf`,
    )
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: 'Kura receipt',
        text,
        files: [file],
      })
      return 'shared'
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Kura receipt', text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
  }

  await navigator.clipboard.writeText(text)
  return 'copied'
}
