import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Button, Select, SegmentedControl } from '@mantine/core'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Camera01Icon, Add01Icon } from 'hugeicons-react'
import type { BatteryRecord } from '@shared/mock/adminMockData'

export type CaptureMethod = 'qr' | 'pick'

function CompactScanner({
  scanning,
  videoRef,
  onStart,
  onStop,
  startLabel,
}: {
  scanning: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  onStart: () => void
  onStop: () => void
  startLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {scanning ? (
        <div className="w-full max-w-[200px] overflow-hidden rounded-[10px] border border-[var(--bd)] bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
        </div>
      ) : (
        <video ref={videoRef} className="hidden" muted playsInline />
      )}
      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <Button
            size="xs"
            variant="light"
            color="brand"
            leftSection={<Camera01Icon size={14} />}
            onClick={onStart}
          >
            {startLabel}
          </Button>
        ) : (
          <Button size="xs" variant="light" onClick={onStop}>
            Stop
          </Button>
        )}
      </div>
    </div>
  )
}

interface HubBatteryPickerProps {
  title: string
  hint: string
  options: BatteryRecord[]
  valueId: string | null
  onChange: (battery: BatteryRecord | null, method: CaptureMethod) => void
  allowRegisterNew?: boolean
  onRegisterNew?: (serial: string, type: string) => BatteryRecord
  unknownBlockedMessage?: string
  batteryTypes?: string[]
}

export function HubBatteryPicker({
  title,
  hint,
  options,
  valueId,
  onChange,
  allowRegisterNew = false,
  onRegisterNew,
  unknownBlockedMessage = 'Pack not in catalogue. Open an incident.',
  batteryTypes = ['Spiro Moto 48V', 'Keke 60V', 'Asobo Marine 72V', 'Max 60V', 'Boat 72V'],
}: HubBatteryPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const [unknownSerial, setUnknownSerial] = useState<string | null>(null)
  const [newType, setNewType] = useState(batteryTypes[0] ?? 'Spiro Moto 48V')
  const capturedRef = useRef(false)

  const selectData = useMemo(
    () =>
      options.map((b) => ({
        value: b.id,
        label: `${b.serial} · ${b.chargePct}% · ${b.status}`,
      })),
    [options],
  )

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => () => stopScanner(), [stopScanner])

  const resolveSerial = useCallback(
    (raw: string, method: CaptureMethod) => {
      const serial = raw.trim().toUpperCase()
      const hit =
        options.find((b) => b.serial.toUpperCase() === serial) ??
        options.find((b) => b.id.toUpperCase() === serial)
      if (hit) {
        setUnknownSerial(null)
        setScanHint(null)
        onChange(hit, method)
        stopScanner()
        return
      }
      setUnknownSerial(serial)
      onChange(null, method)
      setScanHint(
        allowRegisterNew
          ? `"${serial}" not listed — add it or pick another.`
          : unknownBlockedMessage,
      )
      stopScanner()
    },
    [allowRegisterNew, onChange, options, stopScanner, unknownBlockedMessage],
  )

  const startScanner = async () => {
    setScanHint(null)
    setUnknownSerial(null)
    capturedRef.current = false
    try {
      setScanning(true)
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      if (!videoRef.current) {
        setScanning(false)
        return
      }
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (res, err) => {
          if (res && !capturedRef.current) {
            capturedRef.current = true
            resolveSerial(res.getText(), 'qr')
            return
          }
          if (err && err.name !== 'NotFoundException') {
            setScanHint('Scanner unavailable — pick from the list.')
          }
        },
      )
      controlsRef.current = controls
    } catch {
      setScanning(false)
      setScanHint('Camera unavailable — pick from the list.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-[14px] font-bold text-[var(--tx)]">{title}</h3>
        <p className="mt-1 text-[12.5px] text-[var(--mu)]">{hint}</p>
      </div>

      <Select
        label="Pack"
        placeholder={options.length ? 'Select' : 'No eligible packs'}
        data={selectData}
        value={valueId}
        onChange={(id) => {
          const hit = options.find((b) => b.id === id) ?? null
          setUnknownSerial(null)
          setScanHint(null)
          onChange(hit, 'pick')
        }}
        searchable
        nothingFoundMessage="No match"
        allowDeselect={false}
        disabled={options.length === 0}
      />

      <CompactScanner
        scanning={scanning}
        videoRef={videoRef}
        onStart={() => void startScanner()}
        onStop={stopScanner}
        startLabel="Scan pack"
      />

      {scanHint ? (
        <p className="text-[12.5px] font-semibold text-[#C47D0E]">{scanHint}</p>
      ) : null}

      {unknownSerial && allowRegisterNew && onRegisterNew ? (
        <div className="rounded-[10px] border border-dashed border-[var(--bd)] bg-[var(--in)] p-3">
          <p className="text-[12px] font-bold text-[var(--tx)]">Add {unknownSerial}</p>
          <Select
            mt="sm"
            label="Type"
            data={batteryTypes}
            value={newType}
            onChange={(v) => setNewType(v ?? batteryTypes[0]!)}
            allowDeselect={false}
          />
          <Button
            mt="md"
            color="brand"
            leftSection={<Add01Icon size={16} />}
            onClick={() => {
              const created = onRegisterNew(unknownSerial, newType)
              setUnknownSerial(null)
              setScanHint(null)
              onChange(created, 'pick')
            }}
          >
            Add & use
          </Button>
        </div>
      ) : null}

      {unknownSerial && !allowRegisterNew ? (
        <p className="rounded-[10px] border border-[var(--tr)] bg-[var(--tr)]/40 px-3 py-2 text-[12.5px] font-semibold text-[#C0392B]">
          {unknownBlockedMessage}
        </p>
      ) : null}
    </div>
  )
}

export type HoldPreview = {
  code: string
  operatorName: string
  driverKuraId: string
  vehicleReg: string
  vehicleType?: string
  makeModel?: string
  paymentMode: string
  expiresIn: string
}

export type WalkInPreview = {
  vehicleReg: string
  operatorName: string
  driverKuraId: string
  vehicleType?: string
  makeModel?: string
  plan: string
  note: string
}

export type IdentifyMode = 'hold' | 'walkin'

export function HubBayIdentifyInput({
  mode,
  onModeChange,
  holdOptions,
  selectedCode,
  onSelectCode,
  holdPreview,
  onHoldLookup,
  onScanLookup,
  vehicleOptions,
  selectedVehicle,
  onSelectVehicle,
  onVehicleSearch,
  walkInPreview,
  onWalkInContinue,
  error,
}: {
  mode: IdentifyMode
  onModeChange: (mode: IdentifyMode) => void
  holdOptions: Array<{ value: string; label: string }>
  selectedCode: string | null
  onSelectCode: (code: string | null) => void
  holdPreview: HoldPreview | null
  onHoldLookup: (code: string) => void
  onScanLookup: (raw: string) => void
  vehicleOptions: Array<{ value: string; label: string }>
  selectedVehicle: string | null
  onSelectVehicle: (reg: string | null) => void
  onVehicleSearch?: (query: string) => void
  walkInPreview: WalkInPreview | null
  onWalkInContinue: (reg: string) => void
  error?: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraHint, setCameraHint] = useState<string | null>(null)
  const capturedRef = useRef(false)

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => () => stopScanner(), [stopScanner])

  const startScanner = async () => {
    setCameraHint(null)
    capturedRef.current = false
    try {
      setScanning(true)
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      if (!videoRef.current) {
        setScanning(false)
        return
      }
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (res, err) => {
          if (res && !capturedRef.current) {
            capturedRef.current = true
            const text = res.getText()
            if (mode === 'hold') onScanLookup(text)
            else {
              const plate = text.trim().toUpperCase()
              onSelectVehicle(plate)
              onWalkInContinue(plate)
            }
            stopScanner()
            return
          }
          if (err && err.name !== 'NotFoundException') {
            setCameraHint(
              mode === 'hold'
                ? 'Pick a hold from the list instead.'
                : 'Pick the vehicle from the list instead.',
            )
          }
        },
      )
      controlsRef.current = controls
    } catch {
      setScanning(false)
      setCameraHint(
        mode === 'hold'
          ? 'Camera unavailable — pick a hold from the list.'
          : 'Camera unavailable — pick the vehicle from the list.',
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(v) => onModeChange(v as IdentifyMode)}
        data={[
          { label: 'Reservation', value: 'hold' },
          { label: 'Walk-in', value: 'walkin' },
        ]}
      />

      {mode === 'hold' ? (
        <>
          <Select
            label="Active hold at this hub"
            placeholder={holdOptions.length ? 'Search code, rider, plate…' : 'No active holds'}
            data={holdOptions}
            value={selectedCode}
            onChange={onSelectCode}
            searchable
            nothingFoundMessage="No match"
            allowDeselect
            disabled={holdOptions.length === 0}
          />

          {holdPreview ? (
            <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
              <p className="font-mono text-[12px] font-bold text-[var(--pr)]">
                {holdPreview.code}
              </p>
              <p className="mt-1 text-[15px] font-bold text-[var(--tx)]">
                {holdPreview.operatorName}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">
                {holdPreview.driverKuraId} · {holdPreview.vehicleReg}
                {holdPreview.vehicleType ? ` · ${holdPreview.vehicleType}` : ''}
              </p>
              {holdPreview.makeModel ? (
                <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">{holdPreview.makeModel}</p>
              ) : null}
              <p className="mt-2 text-[12.5px] font-semibold text-[var(--tx)]">
                {holdPreview.paymentMode} · expires {holdPreview.expiresIn}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Select
            label="Vehicle at bay (no reservation)"
            placeholder="Search plate, rider, KURA ID…"
            data={vehicleOptions}
            value={selectedVehicle}
            onChange={onSelectVehicle}
            onSearchChange={onVehicleSearch}
            searchable
            nothingFoundMessage="No match"
            allowDeselect
          />

          {walkInPreview ? (
            <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--su)]">
                Walk-in
              </p>
              <p className="mt-1 text-[15px] font-bold text-[var(--tx)]">
                {walkInPreview.operatorName}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">
                {walkInPreview.driverKuraId} · {walkInPreview.vehicleReg}
                {walkInPreview.vehicleType ? ` · ${walkInPreview.vehicleType}` : ''}
              </p>
              {walkInPreview.makeModel ? (
                <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">{walkInPreview.makeModel}</p>
              ) : null}
              <p className="mt-2 text-[12.5px] font-semibold text-[var(--tx)]">
                {walkInPreview.plan} · {walkInPreview.note}
              </p>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p className="text-[12.5px] font-semibold text-[#C0392B]">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          color="brand"
          disabled={mode === 'hold' ? !selectedCode : !selectedVehicle}
          onClick={() => {
            stopScanner()
            if (mode === 'hold') {
              if (!selectedCode) return
              onHoldLookup(selectedCode)
            } else if (selectedVehicle) {
              onWalkInContinue(selectedVehicle)
            }
          }}
        >
          Continue
        </Button>
        <CompactScanner
          scanning={scanning}
          videoRef={videoRef}
          onStart={() => void startScanner()}
          onStop={stopScanner}
          startLabel={mode === 'hold' ? 'Scan hold QR' : 'Scan vehicle QR'}
        />
      </div>
      {cameraHint ? (
        <p className="text-[12.5px] font-semibold text-[#C47D0E]">{cameraHint}</p>
      ) : null}
    </div>
  )
}
