import React, { useMemo, useState } from 'react'
import { Cancel01Icon, ViewOffSlashIcon, ViewIcon } from 'hugeicons-react'
import { PinDigitInputs } from '../operator/PinDigitInputs'
import { HoldFillButton } from '../operator/HoldFillButton'
import { verifyPin, apiErrorMessage } from '../../../lib/api/auth'

/** Demo stand-ins — real product would use signed, short-lived media URLs. */
export const DEMO_ID_FRONT_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d7c8f"/><stop offset="1" stop-color="#003153"/></linearGradient></defs>
  <rect width="640" height="400" rx="24" fill="url(#g)"/>
  <rect x="28" y="28" width="584" height="344" rx="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)"/>
  <circle cx="120" cy="160" r="54" fill="rgba(255,255,255,0.18)"/>
  <rect x="200" y="110" width="220" height="18" rx="6" fill="rgba(255,255,255,0.55)"/>
  <rect x="200" y="146" width="280" height="12" rx="4" fill="rgba(255,255,255,0.28)"/>
  <rect x="200" y="172" width="180" height="12" rx="4" fill="rgba(255,255,255,0.22)"/>
  <text x="48" y="320" fill="rgba(255,255,255,0.9)" font-family="system-ui,sans-serif" font-size="28" font-weight="700">ID FRONT</text>
  <text x="48" y="352" fill="rgba(255,255,255,0.55)" font-family="system-ui,sans-serif" font-size="16">Demo · NIN card</text>
</svg>`)

export const DEMO_ID_BACK_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <rect width="640" height="400" rx="24" fill="#0c1c25"/>
  <rect x="28" y="28" width="584" height="344" rx="16" fill="#122833" stroke="rgba(255,255,255,0.12)"/>
  <rect x="64" y="80" width="512" height="48" rx="8" fill="rgba(47,190,207,0.25)"/>
  <rect x="64" y="160" width="512" height="10" rx="4" fill="rgba(255,255,255,0.2)"/>
  <rect x="64" y="186" width="420" height="10" rx="4" fill="rgba(255,255,255,0.14)"/>
  <rect x="64" y="212" width="360" height="10" rx="4" fill="rgba(255,255,255,0.12)"/>
  <text x="48" y="320" fill="rgba(255,255,255,0.9)" font-family="system-ui,sans-serif" font-size="28" font-weight="700">ID BACK</text>
  <text x="48" y="352" fill="rgba(255,255,255,0.45)" font-family="system-ui,sans-serif" font-size="16">Demo · barcode / details</text>
</svg>`)

export interface IdPhotoTile {
  id: 'front' | 'back'
  label: string
  src: string
}

interface IdPhotosVaultProps {
  frontAttached: boolean
  backAttached: boolean
  frontSrc?: string | null
  backSrc?: string | null
  /** When no card scans exist — keep calm if KYC is already verified. */
  emptyHint?: string
}

export function IdPhotosVault({
  frontAttached,
  backAttached,
  frontSrc,
  backSrc,
  emptyHint = 'No ID photos on file yet.',
}: IdPhotosVaultProps) {
  const tiles = useMemo(() => {
    const list: IdPhotoTile[] = []
    if (frontAttached) {
      list.push({
        id: 'front',
        label: 'Front',
        src: frontSrc || DEMO_ID_FRONT_SRC,
      })
    }
    if (backAttached) {
      list.push({
        id: 'back',
        label: 'Back',
        src: backSrc || DEMO_ID_BACK_SRC,
      })
    }
    return list
  }, [frontAttached, backAttached, frontSrc, backSrc])

  const [unlocked, setUnlocked] = useState(false)
  const [pinGate, setPinGate] = useState(false)
  const [pendingView, setPendingView] = useState<IdPhotoTile | null>(null)
  const [viewer, setViewer] = useState<IdPhotoTile | null>(null)
  const [pin, setPin] = useState(['', '', '', ''])
  const [pinError, setPinError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  if (tiles.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--kura-border)] px-4 py-6 text-center text-[13px] text-[var(--kura-muted)]">
        {emptyHint}
      </p>
    )
  }

  const requestView = (tile: IdPhotoTile) => {
    if (unlocked) {
      setViewer(tile)
      return
    }
    setPendingView(tile)
    setPin(['', '', '', ''])
    setPinError(null)
    setPinGate(true)
  }

  const submitPin = () => {
    if (verifying) return
    setVerifying(true)
    setPinError(null)
    verifyPin(pin.join(''))
      .then(() => {
        setUnlocked(true)
        setPinGate(false)
        if (pendingView) setViewer(pendingView)
        setPendingView(null)
      })
      .catch((err) => {
        setPinError(apiErrorMessage(err, 'Wrong PIN'))
        setPin(['', '', '', ''])
      })
      .finally(() => {
        setVerifying(false)
      })
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--kura-muted)]">
            ID photos
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--kura-muted)]">
            {unlocked ? (
              <>
                <ViewIcon size={14} /> Unlocked
              </>
            ) : (
              <>
                <ViewOffSlashIcon size={14} /> PIN to view
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => requestView(tile)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] text-left"
            >
              <img
                src={tile.src}
                alt=""
                className={`h-full w-full object-cover transition ${
                  unlocked ? '' : 'scale-105 blur-md brightness-75'
                }`}
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
                <span className="text-[13px] font-bold text-white">{tile.label}</span>
              </span>
              {!unlocked ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    Tap · enter PIN
                  </span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--kura-muted)]">
          Photos stay locked so someone else with your phone can’t browse your ID.
        </p>
      </div>

      {pinGate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            onClick={() => {
              setPinGate(false)
              setPendingView(null)
            }}
          />
          <div className="kura-sheet-enter relative z-[1] w-full max-w-md rounded-t-[1.5rem] border border-[var(--kura-border)] bg-[var(--kura-bg)] px-4 pb-8 pt-4 shadow-2xl sm:rounded-[1.5rem]">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[16px] font-bold text-[var(--kura-text)]">
                Enter PIN to view ID
              </h4>
              <button
                type="button"
                onClick={() => {
                  setPinGate(false)
                  setPendingView(null)
                }}
                className="rounded-xl border border-[var(--kura-border)] p-2 text-[var(--kura-muted)]"
              >
                <Cancel01Icon size={18} />
              </button>
            </div>
            <p className="mb-4 text-[12px] text-[var(--kura-muted)]">
              Same PIN you use for wallet and swaps.
            </p>
            <PinDigitInputs
              values={pin}
              onChange={(v) => {
                setPinError(null)
                setPin(v)
              }}
              masked
              autoFocus
            />
            {pinError ? (
              <p className="mt-2 text-[12px] font-medium text-[var(--kura-coral)]">
                {pinError}
              </p>
            ) : null}
            <div className="mt-5">
              <HoldFillButton
                disabled={verifying || !pin.every((d) => d.length === 1)}
                onComplete={submitPin}
                hint="Hold to unlock"
              >
                Unlock photos
              </HoldFillButton>
            </div>
          </div>
        </div>
      ) : null}

      {viewer ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[14px] font-bold text-white">
              ID {viewer.label.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="rounded-xl border border-white/20 bg-white/10 p-2 text-white"
            >
              <Cancel01Icon size={18} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-10">
            <img
              src={viewer.src}
              alt={`ID ${viewer.label}`}
              className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
