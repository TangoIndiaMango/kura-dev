import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface ReservationQrProps {
  code: string
  payload?: string | null
  size?: number
}

export const ReservationQr: React.FC<ReservationQrProps> = ({
  code,
  payload: serverPayload,
  size = 168,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const payload = (serverPayload ?? '').trim()
    if (!payload) {
      setDataUrl(null)
      setFailed(true)
      return () => {
        cancelled = true
      }
    }

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 2,
      color: {
        dark: '#003153',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [serverPayload, size])

  if (failed || !(serverPayload ?? '').trim()) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-[11px] text-[var(--kura-muted)]"
        style={{ width: size, height: size }}
      >
        QR unavailable
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-xl bg-white/10"
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt={`Reservation QR for ${code}`}
      width={size}
      height={size}
      className="rounded-xl bg-white p-2 shadow-sm"
      draggable={false}
    />
  )
}
