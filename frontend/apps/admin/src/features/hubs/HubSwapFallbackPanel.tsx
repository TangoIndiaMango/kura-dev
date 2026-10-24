import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, NumberInput, Skeleton, TextInput } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  AuditTrailRail,
  FilePreviewModal,
  FormFooterActions,
  KuraIllustrationModal,
  RevealImage,
  SidebarFormLayout,
  type AuditTrailItem,
} from '@shared/components'
import {
  type BatteryRecord,
  type HubRecord,
  type ReservationRecord,
} from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import {
  HubBatteryPicker,
  HubBayIdentifyInput,
  type HoldPreview,
  type IdentifyMode,
  type WalkInPreview,
} from './HubScanOrTypeInput'
import { type HubLiveStep, type HubLiveStepId } from './HubSwapLiveSteps'
import {
  HUB_ABORT_REASONS,
  HUB_MISMATCH_REASONS,
  HUB_OVERRIDE_REASONS,
} from './hubBayReasons'
import {
  buildSettlePlan,
  describeMode,
  listSwapDueNaira,
  settleModeLabel,
  type BaySettleMode,
  type SettleActor,
} from './hubSwapSettle'
import { HubSwapSettleSection, settleCompleteBlocked } from './HubSwapSettleSection'
import type { DiscountRedeemOk } from '@features/discounts/discountRedeem'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { useHub, useHubs } from './hooks/use-hubs'
import {
  HubBayVelocityGate,
  throttleHitFromError,
  type VelocityThrottleHit,
} from './HubBayVelocityGate'
import {
  useHubBayBatteries,
  useHubOpenSessions,
  useHubReservations,
  useIdentityMismatch,
  useLookupReservation,
  useReturnPackBySerial,
  useStartSwap,
  useSwapAbort,
  useSwapIssue,
  useSwapReturn,
  useSwapSessionComplete,
  type OpenSwapSessionApi,
} from './hooks/use-bay-swap'
import { HubBayOpenSessions } from './HubBayOpenSessions'
import { axiosInstance } from '@lib/api/client'
import { packStubFromSerial, resumeStepFromSwap } from './hubBayResume'
import { useVerifyAgentPin, useVerifyRiderPin, useRecordBayOverride } from './hooks/use-bay-pins'
import {
  apiPaymentMode,
  bookedDiscountRedeem,
  mapBatteryApi,
  mapLookupApi,
  mapReservationApi,
  type BookedDiscount,
} from './hubBayLiveMap'
import { buildReturnCandidates } from './hubBayReturnCandidates'
import {
  enrichHoldContext,
  fetchLiveBayContext,
  type LiveBayAccount,
} from './hubBayLiveFetch'
import { useVehicles } from '@features/vehicles'
import { useAccountSubscriptions, useAccountVehicles } from '@features/mobility'
import { useWallet, useWalletByAccount } from '@features/finance'
import type { HubDetailApi } from './types'

const HUB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isHubUuid(value: string | undefined): boolean {
  return Boolean(value && HUB_UUID_RE.test(value))
}

function hubRecordFromLive(live: HubDetailApi): HubRecord {
  const status =
    live.status === 'ONLINE' || live.status === 'OFFLINE' || live.status === 'MAINTENANCE'
      ? live.status
      : 'MAINTENANCE'
  return {
    id: live.id,
    name: live.name,
    location: live.address,
    slots: live.slot_count,
    readyBatteries: live.ready_count,
    swapsToday: 0,
    solarCapacity: `${live.solar_capacity_kw} kW`,
    agentOnDuty: 'Bay agent',
    agentPhone: '',
    status,
    lastSync: live.updated_at,
  }
}

type Triage = 'GREEN' | 'AMBER' | 'RED'
type SessionStep = 'lookup' | 'triage' | 'return' | 'issue' | 'settle' | 'done'
type BayConfirmKind = 'complete' | 'mismatch' | 'override' | 'abort' | null

interface SessionLog {
  id: string
  at: string
  title: string
  detail: string
  failed?: boolean
}

interface Identified {
  reservation: ReservationRecord
  method: 'qr' | 'pick' | 'walkin'
  triage: Triage
  policyTriage: Triage
  overridden: boolean
  paymentLabel: string
  needsSettlement: boolean
  skipReturn: boolean
  driverKuraId: string
  faceInitials: string
  facePhotoUrl?: string
  vehicleType?: string
  makeModel?: string
  batteryTypeHint?: string
  phone?: string
  isWalkIn: boolean
  walletBalance: number
  expectedReturnSerial?: string | null
  liveMeta?: {
    accountId: string
    vehicleId: string
    driverId: string
    reservationId: string
    holdAmountKobo: number
    bookedDiscount?: BookedDiscount | null
    reservedBatteryId?: string | null
  }
}

type LiveApplyMeta = {
  accountId: string
  vehicleId: string
  driverId: string
  reservationId: string
  holdAmountKobo?: number
  bookedDiscount?: BookedDiscount | null
  reservedBatteryId?: string | null
  account?: LiveBayAccount
  walletBalanceNaira?: number
  vehicleType?: string
  makeModel?: string
  batteryTypeHint?: string
  skipReturn?: boolean
  expectedReturnSerial?: string | null
  serverTriage?: Triage
  serverTriageReason?: string
}

function nowLabel() {
  const d = new Date()
  return `Today · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

function parseReservationToken(raw: string): { code?: string; token?: string } {
  const trimmed = raw.trim()
  if (/^v1\.[^.]+\.\d+\.[a-f0-9]+$/i.test(trimmed)) {
    return { token: trimmed }
  }
  if (/^KB-[A-Z0-9]+$/i.test(trimmed)) return { code: trimmed.toUpperCase() }
  if (/^RSV-/i.test(trimmed)) return { code: trimmed.toUpperCase() }
  if (trimmed.startsWith('kura:rsv:') || trimmed.startsWith('kura:kb:')) {
    try {
      const prefix = trimmed.startsWith('kura:kb:') ? 'kura:kb:' : 'kura:rsv:'
      const body = JSON.parse(trimmed.slice(prefix.length)) as { code?: string }
      if (body.code) return { code: String(body.code).toUpperCase() }
    } catch {
      /* ignore */
    }
  }
  const m = trimmed.match(/\b(KB|RSV)-[A-Z0-9]+\b/i)
  if (m) return { code: m[0].toUpperCase() }
  return {}
}

function deriveTriage(
  r: ReservationRecord,
  account?: { status?: string; kyc_status?: string } | null,
): Pick<Identified, 'triage' | 'paymentLabel' | 'needsSettlement' | 'skipReturn'> {
  const skipReturn = Boolean(r.firstSwap)
  if (r.status !== 'ACTIVE') {
    return {
      triage: 'RED',
      paymentLabel: r.status,
      needsSettlement: false,
      skipReturn,
    }
  }
  if (account?.status === 'SUSPENDED') {
    return {
      triage: 'RED',
      paymentLabel: 'Account suspended',
      needsSettlement: false,
      skipReturn,
    }
  }
  if (account?.kyc_status === 'REJECTED') {
    return {
      triage: 'RED',
      paymentLabel: 'KYC rejected',
      needsSettlement: false,
      skipReturn,
    }
  }
  if (r.paymentMode === 'CASH_AT_HUB') {
    return {
      triage: 'AMBER',
      paymentLabel: r.code === 'WALK-IN' ? 'Walk-in · collect cash' : 'Collect cash on complete',
      needsSettlement: true,
      skipReturn,
    }
  }
  if (r.paymentMode === 'PAYSTACK') {
    return {
      triage: 'AMBER',
      paymentLabel: r.code === 'WALK-IN' ? 'Walk-in · Paystack at bay' : 'Pays with Paystack at bay',
      needsSettlement: true,
      skipReturn,
    }
  }
  if (r.paymentMode === 'WALLET') {
    return {
      triage: 'GREEN',
      paymentLabel:
        r.code === 'WALK-IN' ? 'Walk-in · wallet debit on complete' : 'Wallet — paid at booking',
      needsSettlement: false,
      skipReturn,
    }
  }
  if (r.paymentMode === 'CREDIT') {
    return {
      triage: 'GREEN',
      paymentLabel: 'Credit — draws on complete',
      needsSettlement: false,
      skipReturn,
    }
  }
  return {
    triage: 'GREEN',
    paymentLabel: r.code === 'WALK-IN' ? 'Walk-in · plan allowance' : 'Plan — paid at booking',
    needsSettlement: false,
    skipReturn,
  }
}

// Wallet top-ups are coming soon: a walk-in pays with Paystack unless a plan covers it.
function walkInPaymentMode(actor: SettleActor): ReservationRecord['paymentMode'] {
  return actor.planCovers ? 'PLAN' : 'PAYSTACK'
}

function stepList(id: Identified | null): Array<{ id: SessionStep; label: string }> {
  if (!id) return [{ id: 'lookup', label: '1 · Identify' }]
  const steps: Array<{ id: SessionStep; label: string }> = [
    { id: 'lookup', label: '1 · Identify' },
    { id: 'triage', label: '2 · Triage' },
  ]
  if (!id.skipReturn) steps.push({ id: 'return', label: `${steps.length + 1} · Return` })
  steps.push({ id: 'issue', label: `${steps.length + 1} · Issue` })
  steps.push({ id: 'settle', label: `${steps.length + 1} · Confirm` })
  return steps
}

function liveSteps(
  identified: Identified | null,
  step: SessionStep,
  returned: BatteryRecord | null,
  issued: BatteryRecord | null,
): HubLiveStep[] {
  const order = stepList(identified).map((s) => s.id)
  const idx = (sid: SessionStep) => order.indexOf(sid)
  const cur = step === 'done' ? order.length : Math.max(0, idx(step))

  const defs: Array<{ id: HubLiveStepId; title: string; detail: string }> = [
    { id: 'lookup', title: 'Identify', detail: 'Hold or walk-in' },
    { id: 'triage', title: 'Triage', detail: 'Face + band' },
  ]
  if (identified && !identified.skipReturn) {
    defs.push({ id: 'return', title: 'Return battery', detail: 'Scan + charge' })
  }
  defs.push(
    { id: 'issue', title: 'Issue battery', detail: 'Charged pack' },
    { id: 'settle', title: 'Confirm', detail: 'Complete swap' },
  )

  return defs.map((d, i) => {
    const isDone = (step as string) === 'done'
    const done =
      isDone ||
      (d.id === 'lookup' && identified != null && cur > 0) ||
      (d.id === 'triage' && cur > idx('triage')) ||
      (d.id === 'return' &&
        (returned != null || (identified?.skipReturn ?? false)) &&
        cur > idx('return')) ||
      (d.id === 'issue' && issued != null && cur > idx('issue'))
    const current = step === d.id || (isDone && d.id === 'settle')
    const reachable = current || done || i < cur || (identified != null && d.id === 'lookup')
    return {
      ...d,
      done: Boolean(done && !current),
      current,
      reachable: step === 'done' ? d.id === 'settle' || d.id === 'lookup' : reachable || i <= cur,
    }
  })
}

function logsToTrail(
  logs: SessionLog[],
  agentName: string,
  agentInitials: string,
): AuditTrailItem[] {
  return [...logs].reverse().map((l) => ({
    id: l.id,
    name: agentName,
    role: l.title,
    verification: l.failed ? 'Failed' : 'Complete',
    verificationTone: l.failed ? 'danger' : 'success',
    action: l.detail,
    actionTone: l.failed ? 'danger' : 'info',
    at: l.at,
    initials: agentInitials,
  }))
}

export function HubSwapFallbackPanel() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const routeId = id ?? ''
  const idIsUuid = isHubUuid(routeId)

  const { hubs: searchedHubs, isPending: searchPending } = useHubs(
    { search: routeId, page_size: 5 },
    { enabled: Boolean(routeId) && !idIsUuid },
  )
  const resolvedHubId = useMemo(() => {
    if (idIsUuid) return routeId
    const byCode = searchedHubs.find(
      (h) => h.code.toUpperCase() === routeId.toUpperCase(),
    )
    return byCode?.id ?? searchedHubs[0]?.id
  }, [idIsUuid, routeId, searchedHubs])

  useEffect(() => {
    if (idIsUuid || !resolvedHubId || !routeId) return
    const qs = searchParams.toString()
    navigate(`/hubs/${resolvedHubId}/swap${qs ? `?${qs}` : ''}`, { replace: true })
  }, [idIsUuid, navigate, resolvedHubId, routeId, searchParams])

  const { hub: liveHub, isPending: livePending } = useHub(resolvedHubId, {
    enabled: Boolean(resolvedHubId),
  })
  const hub = useMemo(
    () => (liveHub ? hubRecordFromLive(liveHub) : null),
    [liveHub],
  )
  const liveHubId = liveHub?.id
  const liveHolds = useHubReservations(liveHubId, { enabled: Boolean(liveHubId) })
  const liveBatteries = useHubBayBatteries(liveHubId, Boolean(liveHubId))
  const lookupMut = useLookupReservation()
  const startMut = useStartSwap()
  const returnMut = useSwapReturn()
  const issueMut = useSwapIssue()
  const sessionCompleteMut = useSwapSessionComplete()
  const abortMut = useSwapAbort()
  const identityMismatchMut = useIdentityMismatch()
  const verifyRiderPin = useVerifyRiderPin()
  const verifyAgentPin = useVerifyAgentPin()
  const recordOverride = useRecordBayOverride()
  const [agentPinGrant, setAgentPinGrant] = useState<string | null>(null)
  const [swapSessionId, setSwapSessionId] = useState<string | null>(null)
  const [paystackPaid, setPaystackPaid] = useState(false)

  const [catalogue, setCatalogue] = useState<BatteryRecord[]>([])
  useEffect(() => {
    const next = liveBatteries.batteries.map(mapBatteryApi)
    setCatalogue((prev) => {
      if (
        prev.length === next.length &&
        prev.every((b, i) => b.id === next[i]?.id && b.serial === next[i]?.serial)
      ) {
        return prev
      }
      return next
    })
  }, [liveBatteries.batteries])

  const [step, setStep] = useState<SessionStep>('lookup')
  const codeFromUrl = searchParams.get('code')?.trim().toUpperCase() || null
  const sessionFromUrl = searchParams.get('session')?.trim() || null
  const [identifyMode, setIdentifyMode] = useState<IdentifyMode>('hold')
  const [selectedCode, setSelectedCode] = useState<string | null>(codeFromUrl)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [debouncedVehicleQuery, setDebouncedVehicleQuery] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [velocityHit, setVelocityHit] = useState<VelocityThrottleHit | null>(null)
  const [identified, setIdentified] = useState<Identified | null>(null)
  const [returned, setReturned] = useState<BatteryRecord | null>(null)
  const [issued, setIssued] = useState<BatteryRecord | null>(null)
  const [returnCharge, setReturnCharge] = useState('')
  // Summary shows packs only once the server accepted the step, not on selection.
  const returnedConfirmed =
    returned && (step === 'issue' || step === 'settle' || step === 'done') ? returned : null
  const issuedConfirmed = issued && (step === 'settle' || step === 'done') ? issued : null
  const returnChargePct = useMemo(() => {
    const n = Number(returnCharge)
    return returnCharge.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 100 ? n : null
  }, [returnCharge])
  const [settleMode, setSettleMode] = useState<BaySettleMode>('PLAN')
  const [topUpRef, setTopUpRef] = useState<string | null>(null)
  const [cashReceiptRef, setCashReceiptRef] = useState<string | null>(null)
  const [riderPinGrant, setRiderPinGrant] = useState<string | null>(null)
  const [settleDiscount, setSettleDiscount] = useState<DiscountRedeemOk | null>(null)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [bayConfirm, setBayConfirm] = useState<BayConfirmKind>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [mismatchAckOpen, setMismatchAckOpen] = useState(false)
  const [mismatchCaseQuery, setMismatchCaseQuery] = useState<{
    operator: string
    accountId?: string
    subject: string
    reason: string
    caseId?: string
    caseCode?: string
  } | null>(null)
  const [cashDepositRef, setCashDepositRef] = useState<string | null>(null)
  const [faceViewerOpen, setFaceViewerOpen] = useState(false)
  const [pinLocked, setPinLocked] = useState(false)
  const urlCodeTriedRef = useRef<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedVehicleQuery(vehicleQuery.trim()), 350)
    return () => window.clearTimeout(t)
  }, [vehicleQuery])

  const { vehicles: vehicleRows } = useVehicles(
    {
      search: debouncedVehicleQuery || undefined,
      page_size: 30,
      status: 'ACTIVE',
    },
    { enabled: Boolean(liveHubId) && identifyMode === 'walkin' },
  )

  const settleAccountId = identified?.liveMeta?.accountId
  const { subscriptions } = useAccountSubscriptions(settleAccountId, {
    enabled: Boolean(settleAccountId) && step === 'settle',
  })
  const { vehicles: accountVehicles } = useAccountVehicles(settleAccountId, {
    enabled: Boolean(settleAccountId) && step === 'settle',
  })
  const { walletId, walletListRow } = useWalletByAccount(settleAccountId, {
    enabled: Boolean(settleAccountId),
  })
  const { wallet } = useWallet(walletId, { enabled: Boolean(walletId) })

  const agentName = hub?.agentOnDuty ?? 'Bay agent'
  const agentInitials = initials(agentName)

  const pushLog = useCallback((title: string, detail: string, failed = false) => {
    setLogs((prev) => [
      { id: `log-${Date.now()}-${prev.length}`, at: nowLabel(), title, detail, failed },
      ...prev,
    ])
  }, [])

  const hubReady = useMemo(() => {
    if (!hub) return []
    // Packs held for other riders are not issuable; this hold's own pack is, and goes first.
    const ownPackId = identified?.liveMeta?.reservedBatteryId ?? null
    const issuable = (b: BatteryRecord) =>
      (b.status === 'AVAILABLE' || (b.status === 'RESERVED' && b.id === ownPackId)) &&
      !String(b.id).startsWith('BAT-NEW-')
    const atHub = catalogue.filter(
      (b) => (b.location === hub.name || b.location.includes(hub.name)) && issuable(b),
    )
    let pool = atHub.length > 0 ? atHub : catalogue.filter(issuable)
    if (identified?.batteryTypeHint) {
      const hint = identified.batteryTypeHint.toLowerCase()
      pool = pool.filter((b) => b.type.toLowerCase().includes(hint))
    }
    return [...pool].sort((a, b) => Number(b.id === ownPackId) - Number(a.id === ownPackId))
  }, [catalogue, hub, identified])

  const returnPackQuery = useReturnPackBySerial(
    identified?.expectedReturnSerial,
    Boolean(
      identified &&
        !identified.skipReturn &&
        (step === 'return' || step === 'triage'),
    ),
  )

  const returnCandidates = useMemo(
    () =>
      buildReturnCandidates({
        expectedSerial: identified?.expectedReturnSerial,
        fetched: returnPackQuery.batteries.map(mapBatteryApi),
        vehicleReg: identified?.reservation.vehicleReg ?? '',
        batteryTypeHint: identified?.batteryTypeHint,
      }),
    [
      identified?.batteryTypeHint,
      identified?.expectedReturnSerial,
      identified?.reservation.vehicleReg,
      returnPackQuery.batteries,
    ],
  )

  const hubHolds = useMemo(() => {
    if (!hub) return []
    return liveHolds.reservations
      .map(mapReservationApi)
      .filter((r) => r.status === 'ACTIVE')
  }, [hub, liveHolds.reservations])

  const holdOptions = useMemo(
    () =>
      hubHolds.map((r) => ({
        value: r.code,
        label: `${r.code} · ${r.operatorName} · ${r.vehicleReg}`,
      })),
    [hubHolds],
  )

  const vehicleOptions = useMemo(() => {
    const opts = vehicleRows.map((v) => ({
      value: v.registration_plate,
      label: [
        v.registration_plate,
        v.hardware_id ? `HW ${v.hardware_id}` : null,
        v.owner_name,
        v.owner_kura_id,
      ]
        .filter(Boolean)
        .join(' · '),
    }))
    if (
      selectedVehicle &&
      !opts.some((o) => o.value.toUpperCase() === selectedVehicle.toUpperCase())
    ) {
      opts.unshift({ value: selectedVehicle, label: selectedVehicle })
    }
    return opts
  }, [vehicleRows, selectedVehicle])

  const holdPreview = useMemo((): HoldPreview | null => {
    if (!selectedCode) return null
    const r = hubHolds.find((h) => h.code === selectedCode)
    if (!r) return null
    return {
      code: r.code,
      operatorName: r.operatorName,
      driverKuraId: r.accountId?.slice(0, 8) ?? '—',
      vehicleReg: r.vehicleReg,
      paymentMode: r.paymentMode.replace(/_/g, ' '),
      expiresIn: r.expiresIn,
    }
  }, [hubHolds, selectedCode])

  const walkInPreview = useMemo((): WalkInPreview | null => {
    if (!selectedVehicle) return null
    const veh = vehicleRows.find(
      (v) => v.registration_plate.toUpperCase() === selectedVehicle.toUpperCase(),
    )
    if (!veh) {
      return {
        vehicleReg: selectedVehicle,
        operatorName: '—',
        driverKuraId: '—',
        plan: '—',
        note: 'Continue to look up this plate',
      }
    }
    const note =
      veh.status === 'SUSPENDED'
        ? 'Blocked — suspended'
        : veh.current_battery_serial
          ? 'No hold · return expected'
          : 'No hold · first swap (skip return)'
    return {
      vehicleReg: veh.registration_plate,
      operatorName: veh.owner_name,
      driverKuraId: veh.owner_kura_id,
      vehicleType: veh.vehicle_type,
      makeModel: `${veh.make} ${veh.model_name}`.trim(),
      plan: 'Live lookup',
      note,
    }
  }, [selectedVehicle, vehicleRows])

  const trailItems = useMemo(
    () => logsToTrail(logs, agentName, agentInitials),
    [logs, agentName, agentInitials],
  )

  const applyReservation = useCallback(
    (reservation: ReservationRecord, method: 'qr' | 'pick' | 'walkin', live?: LiveApplyMeta) => {
      if (!hub) return
      const reservationForTriage: ReservationRecord = {
        ...reservation,
        firstSwap: live?.skipReturn ?? reservation.firstSwap,
      }
      const derived = deriveTriage(reservationForTriage, live?.account)
      if (live?.serverTriage) {
        derived.triage = live.serverTriage
        if (live.serverTriageReason) {
          derived.paymentLabel = live.serverTriageReason
        }
      }
      if (live?.skipReturn != null) {
        derived.skipReturn = live.skipReturn
      }

      if (reservation.status === 'EXPIRED' && method !== 'walkin') {
        setLookupError(
          `Hold ${reservation.code} expired. Log walk-in for ${reservation.vehicleReg} if the rider is here.`,
        )
        pushLog(
          'Hold expired',
          `${reservation.code} · ${reservation.operatorName} · ${reservation.vehicleReg} · no-show / lapsed`,
          true,
        )
        setSelectedVehicle(reservation.vehicleReg)
        setIdentifyMode('walkin')
        return
      }
      if (reservation.status === 'CANCELLED' && method !== 'walkin') {
        setLookupError(`Reservation ${reservation.code} was cancelled.`)
        pushLog('Identify', `${reservation.code} · CANCELLED`, true)
        return
      }
      if (derived.triage === 'RED' && reservation.status !== 'ACTIVE' && method !== 'walkin') {
        setLookupError(`Reservation ${reservation.code} is ${reservation.status}.`)
        pushLog('Identify', `${reservation.code} · ${reservation.status}`, true)
        return
      }
      if (derived.triage === 'RED' && method === 'walkin') {
        setLookupError(derived.paymentLabel)
        pushLog('Identify', `WALK-IN · ${reservation.vehicleReg} · blocked`, true)
        return
      }
      if (
        derived.triage === 'RED' &&
        (live?.account?.status === 'SUSPENDED' || live?.account?.kyc_status === 'REJECTED')
      ) {
        setLookupError(derived.paymentLabel)
        pushLog('Identify', `${reservation.code} · ${derived.paymentLabel}`, true)
        return
      }

      const isWalkIn = method === 'walkin' || reservation.code === 'WALK-IN'
      const actor: SettleActor | undefined = live
        ? {
            walletBalanceNaira: live.walletBalanceNaira ?? 0,
            planCovers: false,
            creditOk: reservation.paymentMode === 'CREDIT',
          }
        : undefined
      const settle = buildSettlePlan(reservation, actor, {
        isWalkIn,
        vehicleType: live?.vehicleType,
        holdAmountKobo: live?.holdAmountKobo,
      })

      const next: Identified = {
        reservation: reservationForTriage,
        method,
        ...derived,
        paymentLabel: settle.label,
        needsSettlement: settle.cashCollect || settle.riderPinRequired,
        policyTriage: derived.triage,
        overridden: false,
        driverKuraId: live?.account?.kura_id ?? '—',
        faceInitials: initials(live?.account?.display_name ?? reservation.operatorName),
        facePhotoUrl: live?.account?.photo_url || undefined,
        vehicleType: live?.vehicleType,
        makeModel: live?.makeModel,
        batteryTypeHint: live?.batteryTypeHint,
        phone: live?.account?.phone || undefined,
        isWalkIn,
        walletBalance: live?.walletBalanceNaira ?? 0,
        expectedReturnSerial: live?.expectedReturnSerial,
        liveMeta: live
          ? {
              accountId: live.accountId,
              vehicleId: live.vehicleId,
              driverId: live.driverId,
              reservationId: live.reservationId,
              holdAmountKobo: live.holdAmountKobo ?? 0,
              bookedDiscount: live.bookedDiscount ?? null,
              reservedBatteryId: live.reservedBatteryId ?? null,
            }
          : undefined,
      }
      setSelectedCode(reservation.code === 'WALK-IN' ? null : reservation.code)
      setSelectedVehicle(reservation.vehicleReg)
      setIdentified(next)
      setSettleMode(settle.recommended)
      setTopUpRef(null)
      setCashReceiptRef(null)
      setCashDepositRef(null)
      setRiderPinGrant(null)
      setSettleDiscount(null)
      setReturned(null)
      setIssued(null)
      setLookupError(null)
      setVelocityHit(null)
      setStep('triage')
      pushLog(
        'Identify',
        method === 'walkin'
          ? `WALK-IN · ${reservation.vehicleReg} · ${next.triage}`
          : `${reservation.code} · ${method} · ${next.triage}`,
      )
    },
    [hub, pushLog],
  )

  const applyMappedHold = useCallback(
    async (
      mapped: ReturnType<typeof mapReservationApi>,
      method: 'qr' | 'pick',
      lookupHints?: {
        skipReturn?: boolean
        expectedReturnSerial?: string | null
        photoUrl?: string | null
        serverTriage?: Triage
        serverTriageReason?: string
      },
    ) => {
      try {
        const enriched = await enrichHoldContext({
          accountId: mapped.accountId,
          vehicleId: mapped.vehicleId,
          driverId: mapped.driverId,
        })
        const skipReturn =
          lookupHints?.skipReturn ?? !enriched.vehicle?.current_battery_serial
        const account = enriched.account
          ? {
              ...enriched.account,
              photo_url: lookupHints?.photoUrl || enriched.account.photo_url,
            }
          : enriched.account
        applyReservation(mapped, method, {
          accountId: mapped.accountId,
          vehicleId: mapped.vehicleId,
          driverId: mapped.driverId,
          reservationId: mapped.id,
          holdAmountKobo: mapped.holdAmountKobo,
          bookedDiscount: mapped.bookedDiscount,
          reservedBatteryId: mapped.reservedBatteryId,
          account,
          walletBalanceNaira: enriched.walletBalanceNaira,
          vehicleType: enriched.vehicle?.vehicle_type,
          makeModel: enriched.vehicle
            ? `${enriched.vehicle.make} ${enriched.vehicle.model_name}`.trim()
            : undefined,
          batteryTypeHint: enriched.vehicle?.battery_type_name,
          skipReturn,
          expectedReturnSerial:
            lookupHints?.expectedReturnSerial ??
            enriched.vehicle?.current_battery_serial,
          serverTriage: lookupHints?.serverTriage,
          serverTriageReason: lookupHints?.serverTriageReason,
        })
      } catch (err) {
        setLookupError(apiErrorMessage(err, 'Could not load rider for this hold.'))
        pushLog('Identify', `${mapped.code} · enrich failed`, true)
      }
    },
    [applyReservation, pushLog],
  )

  const runLookup = useCallback(
    async (code: string) => {
      if (!hub || !liveHubId) return
      setLookupError(null)
      try {
        const body = await lookupMut.mutateAsync({ code, hub_id: liveHubId })
        const looked = mapLookupApi(body)
        await applyMappedHold(looked.mapped, 'pick', {
          skipReturn: looked.skipReturn,
          expectedReturnSerial: looked.expectedReturnSerial,
          photoUrl: looked.photoUrl,
          serverTriage: looked.triage,
          serverTriageReason: looked.triageReason,
        })
      } catch (err) {
        setLookupError(apiErrorMessage(err, `No active hold ${code} at this hub.`))
        pushLog('Identify', `${code} · pick`, true)
      }
    },
    [applyMappedHold, hub, liveHubId, lookupMut, pushLog],
  )

  const runScanLookup = useCallback(
    async (raw: string) => {
      if (!hub || !liveHubId) return
      setLookupError(null)
      const parsed = parseReservationToken(raw)
      if (!parsed.code && !parsed.token) {
        setLookupError('Not a reservation QR. Pick a hold or use Walk-in.')
        return
      }
      try {
        const body = await lookupMut.mutateAsync({
          code: parsed.code,
          token: parsed.token,
          hub_id: liveHubId,
        })
        const looked = mapLookupApi(body)
        await applyMappedHold(looked.mapped, 'qr', {
          skipReturn: looked.skipReturn,
          expectedReturnSerial: looked.expectedReturnSerial,
          photoUrl: looked.photoUrl,
          serverTriage: looked.triage,
          serverTriageReason: looked.triageReason,
        })
      } catch (err) {
        setLookupError(
          apiErrorMessage(err, `No reservation ${parsed.code || 'QR'} at this hub.`),
        )
        pushLog('Identify', `${parsed.code || 'token'} · qr`, true)
      }
    },
    [applyMappedHold, hub, liveHubId, lookupMut, pushLog],
  )

  const applyWalkIn = useCallback(
    async (reg: string) => {
      if (!hub) return
      setLookupError(null)
      try {
        const ctx = await fetchLiveBayContext(reg)
        const actor: SettleActor = {
          walletBalanceNaira: ctx.walletBalanceNaira,
          planCovers: ctx.planCovers,
          creditOk: false,
        }
        const skipReturn = !ctx.vehicle.current_battery_serial
        const synthetic: ReservationRecord = {
          id: `WALK-${ctx.vehicle.id}`,
          code: 'WALK-IN',
          time: nowLabel().replace('Today · ', ''),
          operatorName: ctx.account.display_name,
          hubName: hub.name,
          vehicleReg: ctx.vehicle.registration_plate,
          expiresIn: '—',
          status: 'ACTIVE',
          paymentMode: walkInPaymentMode(actor),
          firstSwap: skipReturn,
        }
        setIdentifyMode('walkin')
        applyReservation(synthetic, 'walkin', {
          accountId: ctx.account.id,
          vehicleId: ctx.vehicle.id,
          driverId: ctx.driverId,
          reservationId: '',
          holdAmountKobo: 0,
          account: ctx.account,
          walletBalanceNaira: ctx.walletBalanceNaira,
          vehicleType: ctx.vehicle.vehicle_type,
          makeModel: `${ctx.vehicle.make} ${ctx.vehicle.model_name}`.trim(),
          batteryTypeHint: ctx.vehicle.battery_type_name,
          skipReturn,
          expectedReturnSerial: ctx.vehicle.current_battery_serial,
        })
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : apiErrorMessage(err, `Vehicle ${reg} not found.`)
        setLookupError(msg)
        pushLog('Identify', `WALK-IN · ${reg}`, true)
      }
    },
    [applyReservation, hub, pushLog],
  )

  // In-progress sessions at this bay (server status is the truth).
  const openSessions = useHubOpenSessions(liveHubId ?? undefined)
  const [sessionBusyId, setSessionBusyId] = useState<string | null>(null)
  const sessionUrlTriedRef = useRef<string | null>(null)

  /** Re-identify the session's rider (face check stays); starting the swap
   *  then resumes it at its step. A booking that is no longer live is
   *  continued by vehicle — the server resumes the same session either way. */
  const continueSession = useCallback(
    async (s: OpenSwapSessionApi) => {
      setSessionBusyId(s.id)
      try {
        pushLog('Continue', `${s.vehicle_plate ?? 'Vehicle'} · ${s.status}`)
        if (s.reservation) {
          const res = await axiosInstance
            .get<{ code: string; status: string }>(`/mobility/reservations/${s.reservation}/`, {
              silentError: true,
            })
            .catch(() => null)
          const live = res?.data && (res.data.status === 'CONFIRMED' || res.data.status === 'PENDING')
          if (live) {
            await runLookup(res.data.code)
            return
          }
        }
        if (s.vehicle_plate) await applyWalkIn(s.vehicle_plate)
      } finally {
        setSessionBusyId(null)
      }
    },
    [applyWalkIn, pushLog, runLookup],
  )

  const endSession = useCallback(
    async (s: OpenSwapSessionApi, reason: string) => {
      setSessionBusyId(s.id)
      try {
        await abortMut.mutateAsync({ swapId: s.id, reason })
        pushLog('Session', `${s.vehicle_plate ?? 'Vehicle'} · ${reason}`, true)
        await Promise.all([openSessions.refetch(), liveBatteries.refetch()])
      } catch (err) {
        notifications.show({ color: 'red', message: apiErrorMessage(err, 'Could not cancel the session.') })
        throw err
      } finally {
        setSessionBusyId(null)
      }
    },
    [abortMut, liveBatteries, openSessions, pushLog],
  )

  const restartSession = useCallback(
    async (s: OpenSwapSessionApi) => {
      await endSession(s, 'Restarted at bay')
      if (s.vehicle_plate) await applyWalkIn(s.vehicle_plate)
    },
    [applyWalkIn, endSession],
  )

  // Deep link from the swap detail page / hub feed: /hubs/:id/swap?session=<swap id>
  useEffect(() => {
    if (!sessionFromUrl || step !== 'lookup' || identified || openSessions.isPending) return
    if (sessionUrlTriedRef.current === sessionFromUrl) return
    sessionUrlTriedRef.current = sessionFromUrl
    const hit = openSessions.sessions.find((x) => x.id === sessionFromUrl)
    if (hit) void continueSession(hit)
    else setLookupError('That session is no longer in progress at this bay.')
  }, [continueSession, identified, openSessions.isPending, openSessions.sessions, sessionFromUrl, step])

  useEffect(() => {
    if (!hub || !liveHubId || !codeFromUrl || step !== 'lookup' || identified) return
    if (urlCodeTriedRef.current === codeFromUrl) return
    const hit = hubHolds.find((r) => r.code.toUpperCase() === codeFromUrl)
    if (hit) {
      urlCodeTriedRef.current = codeFromUrl
      applyMappedHold(hit, 'pick')
      return
    }
    if (!liveHolds.isPending) {
      urlCodeTriedRef.current = codeFromUrl
      runLookup(codeFromUrl)
    }
  }, [
    applyMappedHold,
    codeFromUrl,
    hub,
    hubHolds,
    identified,
    liveHubId,
    liveHolds.isPending,
    runLookup,
    step,
  ])

  const liveWalletNaira = useMemo(() => {
    const kobo = wallet?.available_kobo ?? walletListRow?.available_kobo
    if (kobo != null) return kobo / 100
    return identified?.walletBalance ?? 0
  }, [wallet, walletListRow, identified?.walletBalance])

  // Agents without finance:read get no balance (privacy). Treat it as unknown, not ₦0:
  // wallet stays selectable and the server checks funds at the rider-PIN debit.
  const walletVisible = (wallet?.available_kobo ?? walletListRow?.available_kobo) != null
  const walletForSettle = walletVisible ? liveWalletNaira : Number.POSITIVE_INFINITY

  const settleActor = useMemo((): SettleActor | undefined => {
    if (!identified) return undefined
    const planCovers = subscriptions.some((s) => s.status === 'ACTIVE')
    return {
      walletBalanceNaira: walletForSettle,
      planCovers,
      creditOk: identified.reservation.paymentMode === 'CREDIT',
    }
  }, [identified, walletForSettle, subscriptions])

  // Code redeemed at booking: the server charges the booked price, so the bay shows it too.
  const bookedDiscount = identified?.liveMeta?.bookedDiscount
  const bookedRedeem = useMemo(
    () => (bookedDiscount ? bookedDiscountRedeem(bookedDiscount) : null),
    [bookedDiscount],
  )
  const appliedDiscount = settleDiscount ?? bookedRedeem

  const settlePlan = useMemo(() => {
    if (!identified || !settleActor) return null
    const listDue = listSwapDueNaira(
      identified.vehicleType ?? identified.makeModel,
    )
    const due = appliedDiscount?.dueNaira ?? listDue
    const holdKobo = Math.max(0, identified.liveMeta?.holdAmountKobo ?? 0)
    const holdNaira = holdKobo / 100
    const hasActiveHold = holdKobo > 0
    const base = buildSettlePlan(identified.reservation, settleActor, {
      isWalkIn: identified.isWalkIn,
      overridden: identified.overridden,
      dueNaira: due,
      vehicleType: identified.vehicleType,
      holdAmountKobo: holdKobo,
    })
    const effectiveWallet = hasActiveHold
      ? walletForSettle + holdNaira
      : walletForSettle
    const fundedWallet =
      effectiveWallet + (topUpRef ? Math.max(0, due - effectiveWallet) : 0)
    const shortfall = hasActiveHold ? 0 : Math.max(0, due - fundedWallet)
    const plan = describeMode(settleMode, {
      due,
      wallet: fundedWallet,
      shortfall,
      allowed: base.allowed,
      isWalkIn: identified.isWalkIn,
      reservation: identified.reservation,
      holdAmountKobo: holdKobo,
    })
    return settleMode === 'PAYSTACK' && paystackPaid
      ? { ...plan, label: 'Paid with Paystack — ready to complete' }
      : plan
  }, [identified, settleActor, settleMode, topUpRef, appliedDiscount, walletForSettle, paystackPaid])

  const settleVehicleCount = Math.max(1, accountVehicles.length || 1)

  const switchWalletToCash = useCallback(
    (reason: string) => {
      if (!identified) return
      setSettleMode('CASH_AT_HUB')
      setCashReceiptRef(null)
      setTopUpRef(null)
      setRiderPinGrant(null)
      setConfirmOpen(false)
      setBayConfirm(null)
      setIdentified({
        ...identified,
        paymentLabel: settleModeLabel('CASH_AT_HUB'),
        needsSettlement: true,
      })
      setStep('settle')
      pushLog('Confirm', `Switched to cash. ${reason}`, true)
      setLookupError(null)
    },
    [identified, pushLog],
  )

  const hubLoading =
    (!hub && (livePending || (!idIsUuid && searchPending))) ||
    (!idIsUuid && !resolvedHubId && searchPending)

  if (hubLoading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton height={40} width={220} />
        <Skeleton height={280} />
      </div>
    )
  }

  if (!hub) {
    return (
      <AdminDetailPage
        backLabel="Back to hubs"
        onBack={() => navigate('/hubs')}
        title="Hub not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      >
        <p className="text-[13px] text-[var(--mu)]">
          Open a live hub from Admin → Hubs (UUID or hub code). Seed with{' '}
          <code>just seed</code> then use Open bay workspace.
        </p>
      </AdminDetailPage>
    )
  }

  const resetSession = () => {
    setStep('lookup')
    setIdentified(null)
    setIdentifyMode('hold')
    setSelectedCode(null)
    setSelectedVehicle(null)
    setReturned(null)
    setIssued(null)
    setReturnCharge('')
    setSettleMode('PLAN')
    setTopUpRef(null)
    setCashReceiptRef(null)
    setCashDepositRef(null)
    setRiderPinGrant(null)
    setAgentPinGrant(null)
    setSwapSessionId(null)
    setPaystackPaid(false)
    setLookupError(null)
    setVelocityHit(null)
    setSuccessOpen(false)
    setMismatchAckOpen(false)
    setMismatchCaseQuery(null)
    setBayConfirm(null)
    setConfirmOpen(false)
    setPinLocked(false)
    setLogs([])
    urlCodeTriedRef.current = null
  }

  const acceptFace = async () => {
    if (!identified || identified.triage === 'RED' || !liveHubId || !identified.liveMeta) {
      return
    }
    const vehicleId = identified.liveMeta.vehicleId
    try {
      const session = await startMut.mutateAsync({
        hub_id: liveHubId,
        client_event_id: crypto.randomUUID(),
        reservation_id: identified.isWalkIn
          ? null
          : identified.liveMeta.reservationId,
        vehicle_id: vehicleId,
        driver_id: identified.liveMeta.driverId,
        account_id: identified.liveMeta.accountId,
      })
      setSwapSessionId(session.id)
      setLookupError(null)
      setVelocityHit(null)
      // A resumed session is the truth: once its return is recorded the
      // vehicle has no pack mounted, which must not read as a first swap.
      const returnedOnServer = Boolean(session.returned_serial)
      const skipReturn = identified.skipReturn && !returnedOnServer
      if (skipReturn !== identified.skipReturn) setIdentified({ ...identified, skipReturn })
      const next = resumeStepFromSwap(session, skipReturn)
      const returnedPack = packStubFromSerial(session.returned_serial, catalogue)
      const issuedPack = packStubFromSerial(session.issued_serial, catalogue)
      if (returnedPack) setReturned(returnedPack)
      if (session.returned_charge_pct != null) setReturnCharge(String(session.returned_charge_pct))
      if (issuedPack) setIssued(issuedPack)
      setStep(next)
      void openSessions.refetch()
      pushLog(
        'Triage',
        session.resumed
          ? `Resume · session ${session.id.slice(0, 8)} · ${session.status}`
          : identified.skipReturn
            ? `Matches · session ${session.id.slice(0, 8)} · first swap`
            : `Matches · session ${session.id.slice(0, 8)} · return`,
      )
    } catch (err) {
      const throttle = throttleHitFromError(err, vehicleId)
      if (throttle) {
        setVelocityHit(throttle)
        setLookupError(null)
        pushLog('Triage', `Velocity · ${throttle.message}`, true)
        return
      }
      const msg = apiErrorMessage(err, 'Could not start swap session.')
      setLookupError(msg)
      notifications.show({ color: 'red', message: msg })
    }
  }

  const openMismatch = () => {
    if (!identified) return
    setBayConfirm('mismatch')
    setConfirmOpen(true)
  }

  const openOverride = () => {
    if (!identified || pinLocked) return
    setBayConfirm('override')
    setConfirmOpen(true)
  }

  const openAbort = () => {
    if (!identified || !swapSessionId) return
    setBayConfirm('abort')
    setConfirmOpen(true)
  }

  const applyMismatch = async (reason?: string) => {
    if (!identified) return
    const label = reason ?? 'Identity mismatch'
    const accountId = identified.liveMeta?.accountId
    if (!accountId) {
      setLookupError('Account missing — cannot open identity mismatch case.')
      return
    }
    pushLog('Triage', `Mismatch · ${label}`, true)
    try {
      const result = await identityMismatchMut.mutateAsync({
        account_id: accountId,
        reason: label,
        subject: `Identity mismatch · ${identified.reservation.vehicleReg}`,
        hub_id: liveHubId,
        reservation_code: identified.reservation.code,
      })
      setMismatchCaseQuery({
        operator: identified.reservation.operatorName,
        accountId,
        subject: `Identity mismatch · ${identified.reservation.vehicleReg}`,
        reason: label,
        caseId: result.case_id,
        caseCode: result.case_code,
      })
      setConfirmOpen(false)
      setBayConfirm(null)
      setStep('lookup')
      setIdentified(null)
      setSelectedCode(null)
      setSwapSessionId(null)
      setPaystackPaid(false)
      setSelectedVehicle(null)
      setReturned(null)
      setIssued(null)
      setMismatchAckOpen(true)
    } catch (err) {
      const msg = apiErrorMessage(err, 'Could not record identity mismatch')
      setLookupError(msg)
      notifications.show({ color: 'red', message: msg })
    }
  }

  const applyOverride = async (reason?: string) => {
    if (!identified || !liveHubId || !identified.liveMeta) return
    const label = reason ?? 'Operational discretion'
    if (!agentPinGrant) {
      setLookupError('Agent PIN confirmation missing. Try authorize again.')
      return
    }
    let startedSessionId: string | null = null
    try {
      const session = await startMut.mutateAsync({
        hub_id: liveHubId,
        client_event_id: crypto.randomUUID(),
        reservation_id: identified.isWalkIn
          ? null
          : identified.liveMeta.reservationId,
        vehicle_id: identified.liveMeta.vehicleId,
        driver_id: identified.liveMeta.driverId,
        account_id: identified.liveMeta.accountId,
      })
      startedSessionId = session.id
      await recordOverride.mutateAsync({
        reason: reason ?? 'ops_discretion',
        note: label,
        pin_grant: agentPinGrant,
        swap_id: session.id,
      })
      setSwapSessionId(session.id)
      setIdentified({
        ...identified,
        triage: 'AMBER',
        overridden: true,
        paymentLabel: identified.paymentLabel.includes('Override')
          ? identified.paymentLabel
          : `${identified.paymentLabel} · override`,
      })
      pushLog('Triage', `Override authorized · ${label}`)
      setAgentPinGrant(null)
      setConfirmOpen(false)
      setBayConfirm(null)
      setStep(identified.skipReturn ? 'issue' : 'return')
    } catch (err) {
      if (startedSessionId) {
        await abortMut
          .mutateAsync({
            swapId: startedSessionId,
            reason: 'override_record_failed',
          })
          .catch(() => undefined)
      }
      setLookupError(apiErrorMessage(err, 'Override rejected — check agent PIN grant.'))
    }
  }

  const applyAbort = async (reason?: string) => {
    if (!identified) return
    const label = reason ?? 'Aborted'
    try {
      if (swapSessionId) {
        await abortMut.mutateAsync({ swapId: swapSessionId, reason: label })
      }
      pushLog(
        'Abort',
        `${identified.reservation.code} · ${label}${issued ? ` · pack ${issued.serial}` : ''}`,
        true,
      )
      setReturned(null)
      setIssued(null)
      setIdentified(null)
      setSelectedCode(null)
      setSelectedVehicle(null)
      setSwapSessionId(null)
      setPaystackPaid(false)
      setConfirmOpen(false)
      setBayConfirm(null)
      setStep('lookup')
      setLookupError(`Swap aborted · ${label}`)
      await Promise.all([liveBatteries.refetch(), openSessions.refetch()])
    } catch (err) {
      setLookupError(apiErrorMessage(err, 'Could not abort swap session.'))
    }
  }

  const completeSwap = async () => {
    if (!identified || !issued || !settlePlan || !liveHubId || !identified.liveMeta) {
      setLookupError('Missing live session context. Re-identify the rider.')
      return
    }
    if (!swapSessionId) {
      setLookupError('No active swap session. Re-run triage to start.')
      return
    }
    const block = settleCompleteBlocked(settleMode, settlePlan, cashReceiptRef, topUpRef, paystackPaid)
    if (block) {
      setLookupError(block)
      return
    }
    if (settlePlan.riderPinRequired && !riderPinGrant) {
      setLookupError('Rider PIN required before complete.')
      return
    }
    if (!returned && !identified.skipReturn) {
      setLookupError('Scan the returned pack before completing.')
      return
    }

    const dueAmt = settlePlan.dueNaira
    const discountNote = appliedDiscount
      ? ` · ${appliedDiscount.code} (−${formatNaira(appliedDiscount.discountNaira)})`
      : ''

    try {
      const amount_kobo = Math.round(dueAmt * 100)
      const hasHold = (identified.liveMeta.holdAmountKobo || 0) > 0
      await sessionCompleteMut.mutateAsync({
        swapId: swapSessionId,
        amount_kobo:
          settleDiscount && !hasHold
            ? Math.round(settleDiscount.listNaira * 100)
            : settleMode === 'CASH_AT_HUB' || settleMode === 'WALLET'
              ? amount_kobo
              : identified.liveMeta.holdAmountKobo || amount_kobo,
        payment_mode: apiPaymentMode(settleMode),
        ...(settleDiscount && !hasHold && settleMode !== 'PAYSTACK'
          ? { discount_code: settleDiscount.code }
          : {}),
        ...(settlePlan.riderPinRequired && riderPinGrant
          ? { rider_pin_grant: riderPinGrant }
          : {}),
      })
      await liveHolds.refetch()
      await liveBatteries.refetch()
      void openSessions.refetch()

      if (settleMode === 'CASH_AT_HUB' && cashReceiptRef) {
        setCashDepositRef(formatNaira(dueAmt))
        pushLog(
          'Confirm',
          `Cash ${cashReceiptRef} · ${formatNaira(dueAmt)}${discountNote} · receipt queued`,
        )
      } else {
        setCashDepositRef(null)
        pushLog('Confirm', `${settlePlan.label}${discountNote}`)
      }

      pushLog(
        'Swap completed',
        `${identified.reservation.code} · ${settleModeLabel(settleMode)} · live${discountNote}`,
      )
      setConfirmOpen(false)
      setBayConfirm(null)
      setStep('done')
      setSuccessOpen(true)
    } catch (err) {
      const msg = apiErrorMessage(err, 'Could not complete swap')
      setLookupError(msg)
      notifications.show({ color: 'red', message: msg })
      pushLog('Swap failed', msg, true)
    }
  }

  const onBayConfirm = (reason?: string) => {
    if (bayConfirm === 'mismatch') applyMismatch(reason)
    else if (bayConfirm === 'override') applyOverride(reason)
    else if (bayConfirm === 'abort') applyAbort(reason)
    else {
      completeSwap()
    }
  }

  const checklist = liveSteps(identified, step, returned, issued)

  const goToStep = (stepId: HubLiveStepId) => {
    if (stepId === 'done') return
    if (stepId === 'lookup') {
      setStep('lookup')
      return
    }
    if (!identified) return
    if (stepId === 'return' && identified.skipReturn) {
      setStep('issue')
      return
    }
    setStep(stepId)
  }

  const goBack = () => {
    const order = stepList(identified).map((s) => s.id)
    const i = order.indexOf(step === 'done' ? 'settle' : step)
    if (i <= 0) {
      setStep('lookup')
      return
    }
    setStep(order[i - 1]!)
  }

  const trailTone =
    step === 'done' ? 'success' : logs.some((l) => l.failed) ? 'warning' : 'neutral'

  const showSummary = identified != null

  const formSteps = checklist
    .filter((s) => s.id !== 'done')
    .map((s) => ({
      label: s.title,
      description: s.detail,
    }))
  const activeFormStep = Math.max(
    0,
    checklist.findIndex((s) => s.current && s.id !== 'done'),
  )
  const onFormStepChange = (index: number) => {
    const visible = checklist.filter((s) => s.id !== 'done')
    const target = visible[index]
    if (target?.reachable) goToStep(target.id)
  }

  const swapTips = [
    'Expired holds release the bay — walk-in if the rider is present and stock is ready.',
    'Target under 60 seconds from identify to confirm.',
    'Overrides need the agent PIN · 3+/day alerts ops.',
  ]

  const primaryFooter = (() => {
    if (step === 'done') {
      return {
        label: 'New session',
        disabled: false,
        onClick: resetSession,
        showBack: false,
      }
    }
    if (step === 'lookup') {
      return {
        label: 'Waiting for identify…',
        disabled: true,
        onClick: () => undefined,
        showBack: false,
      }
    }
    if (identified && step === 'triage') {
      if (identified.triage === 'RED' && !identified.overridden) {
        return {
          label: pinLocked ? 'Override locked' : 'Supervisor override',
          disabled: pinLocked,
          onClick: openOverride,
          showBack: true,
        }
      }
      if (velocityHit) {
        return {
          label: 'Velocity gate open',
          disabled: true,
          onClick: () => undefined,
          showBack: true,
        }
      }
      return {
        label: 'Matches · continue',
        disabled: startMut.isPending,
        onClick: acceptFace,
        showBack: true,
      }
    }
    if (identified && step === 'return') {
      return {
        label: 'Continue to issue',
        disabled:
          !returned || !swapSessionId || returnMut.isPending || returnChargePct === null,
        onClick: async () => {
          if (!returned || !swapSessionId || returnChargePct === null) return
          try {
            await returnMut.mutateAsync({
              swapId: swapSessionId,
              battery_serial: returned.serial,
              charge_pct: returnChargePct,
            })
            pushLog('Return', `${returned.serial} · ${returnCharge}%`)
            setLookupError(null)
            setStep('issue')
          } catch (err) {
            const msg = apiErrorMessage(err, 'Could not record return.')
            setLookupError(msg)
            notifications.show({ color: 'red', message: msg })
          }
        },
        showBack: true,
      }
    }
    if (identified && step === 'issue') {
      return {
        label: 'Continue to confirm',
        disabled: !issued || !swapSessionId || issueMut.isPending,
        onClick: async () => {
          if (!issued || !swapSessionId) return
          try {
            await issueMut.mutateAsync({
              swapId: swapSessionId,
              battery_serial: issued.serial,
              charge_pct: issued.chargePct || 100,
            })
            pushLog('Issue', issued.serial)
            setLookupError(null)
            setStep('settle')
          } catch (err) {
            const msg = apiErrorMessage(err, 'Could not issue pack.')
            setLookupError(msg)
            notifications.show({ color: 'red', message: msg })
          }
        },
        showBack: true,
      }
    }
    if (identified && step === 'settle' && settlePlan) {
      const blocked = settleCompleteBlocked(
        settleMode,
        settlePlan,
        cashReceiptRef,
        topUpRef,
        paystackPaid,
      )
      return {
        label: 'Complete swap',
        disabled:
          !issued ||
          Boolean(blocked) ||
          sessionCompleteMut.isPending ||
          abortMut.isPending,
        onClick: () => {
          setBayConfirm('complete')
          setConfirmOpen(true)
        },
        showBack: true,
      }
    }
    return {
      label: 'Continue',
      disabled: true,
      onClick: () => undefined,
      showBack: true,
    }
  })()

  return (
    <>
      <SidebarFormLayout
        sidebarTitle="Hub swap"
        sidebarSubtitle={hub.name}
        sidebarTips={swapTips}
        steps={formSteps}
        activeStep={activeFormStep}
        onStepChange={onFormStepChange}
        onClose={() => navigate(`/hubs/${hub.id}`)}
        headerActionLabel="Close ×"
        contentWidth={1100}
        footer={
          <FormFooterActions
            onBack={goBack}
            showBack={primaryFooter.showBack && step !== 'lookup'}
            submitLabel={primaryFooter.label}
            submitType="button"
            disabled={primaryFooter.disabled}
            onSubmitClick={primaryFooter.onClick}
            secondaryActions={
              <>
                {identified && step === 'triage' ? (
                  <Button variant="light" color="red" onClick={openMismatch}>
                    Identity mismatch
                  </Button>
                ) : null}
                {identified && (step === 'issue' || step === 'settle') && issued ? (
                  <Button variant="light" color="red" onClick={openAbort}>
                    Abort swap
                  </Button>
                ) : null}
                {step !== 'done' ? (
                  <Button variant="default" onClick={resetSession}>
                    New session
                  </Button>
                ) : null}
              </>
            }
          />
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.85fr)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {lookupError && step !== 'lookup' ? (
              <div
                role="alert"
                className="rounded-[12px] border border-[color-mix(in_srgb,#e74c3c_35%,var(--bd))] bg-[color-mix(in_srgb,#e74c3c_10%,var(--sf))] px-4 py-3 text-[13px] font-semibold text-[var(--tx)]"
              >
                {lookupError}
              </div>
            ) : null}
            {velocityHit && step === 'triage' && identified ? (
              <HubBayVelocityGate
                hit={velocityHit}
                hubId={liveHubId}
                accountId={identified.liveMeta?.accountId}
                retrying={startMut.isPending}
                onRetry={() => {
                  acceptFace()
                }}
                onDismiss={() => setVelocityHit(null)}
              />
            ) : null}
            {step === 'lookup' && !identified ? (
              <HubBayOpenSessions
                sessions={openSessions.sessions}
                busyId={sessionBusyId}
                onContinue={(s) => void continueSession(s)}
                onRestart={restartSession}
                onCancel={(s) => endSession(s, 'Cancelled at bay')}
              />
            ) : null}
            {step === 'lookup' ? (
              <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
                <h3 className="mb-1 text-[14px] font-bold text-[var(--tx)]">Identify</h3>
                <p className="mb-3 text-[12.5px] text-[var(--mu)]">
                  Use a bay hold, or walk-in by vehicle when the rider has no reservation.
                </p>
                <HubBayIdentifyInput
                  mode={identifyMode}
                  onModeChange={(m) => {
                    setIdentifyMode(m)
                    setLookupError(null)
                  }}
                  holdOptions={holdOptions}
                  selectedCode={selectedCode}
                  onSelectCode={setSelectedCode}
                  holdPreview={holdPreview}
                  onHoldLookup={runLookup}
                  onScanLookup={runScanLookup}
                  vehicleOptions={vehicleOptions}
                  selectedVehicle={selectedVehicle}
                  onSelectVehicle={setSelectedVehicle}
                  onVehicleSearch={setVehicleQuery}
                  walkInPreview={walkInPreview}
                  onWalkInContinue={applyWalkIn}
                  error={lookupError}
                />
                <p className="mt-3 text-[11.5px] text-[var(--mu)]">
                  Expired codes: search/scan to log no-show, then walk-in. Full list →{' '}
                  <Link
                    to="/swaps?tab=reservations"
                    className="font-semibold text-[var(--pr)] hover:underline"
                  >
                    Swaps · Reservations
                  </Link>
                  .
                </p>
              </section>
            ) : null}

            {showSummary ? (
              <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[14px] font-bold text-[var(--tx)]">Session summary</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      identified.triage === 'GREEN'
                        ? 'bg-[var(--tg)] text-[#1B7A3E]'
                        : identified.triage === 'AMBER'
                          ? 'bg-[var(--ta)] text-[#C47D0E]'
                          : 'bg-[var(--tr)] text-[#C0392B]'
                    }`}
                  >
                    {identified.triage}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                      {identified.isWalkIn ? 'Session' : 'Hold'}
                    </dt>
                    <dd className="mt-0.5 font-mono text-[13px] font-bold text-[var(--pr)]">
                      {identified.isWalkIn ? 'WALK-IN' : identified.reservation.code}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                      Payment
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium text-[var(--tx)]">
                      {settlePlan?.label ?? identified.paymentLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                      Operator
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-bold text-[var(--tx)]">
                      {identified.reservation.operatorName}
                    </dd>
                    <dd className="text-[12.5px] text-[var(--mu)]">
                      {identified.driverKuraId}
                      {identified.phone ? ` · ${identified.phone}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                      Vehicle
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-bold text-[var(--tx)]">
                      {identified.reservation.vehicleReg}
                    </dd>
                    <dd className="text-[12.5px] text-[var(--mu)]">
                      {[identified.vehicleType, identified.makeModel].filter(Boolean).join(' · ') ||
                        '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                      Hub / agent
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium text-[var(--tx)]">{hub.name}</dd>
                    <dd className="text-[12.5px] text-[var(--mu)]">
                      {agentName}
                      {hub.agentPhone ? ` · ${hub.agentPhone}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                      Packs
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium text-[var(--tx)]">
                      {issuedConfirmed ? (
                        <>
                          Out <span className="font-bold">{issuedConfirmed.serial}</span>
                          {returnedConfirmed ? (
                            <>
                              {' '}
                              · in <span className="font-bold">{returnedConfirmed.serial}</span>
                              {` · ${returnCharge}%`}
                            </>
                          ) : identified.skipReturn ? (
                            ' · no return (first swap)'
                          ) : (
                            ' · return pending'
                          )}
                        </>
                      ) : returnedConfirmed ? (
                        <>
                          In <span className="font-bold">{returnedConfirmed.serial}</span>
                          {` · ${returnCharge}%`} · issue pending
                        </>
                      ) : identified.skipReturn ? (
                        'Issue pending · no return'
                      ) : (
                        'Return & issue pending'
                      )}
                    </dd>
                  </div>
                </dl>

                {step === 'triage' ? (
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--bd)] pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (identified.facePhotoUrl) setFaceViewerOpen(true)
                      }}
                      disabled={!identified.facePhotoUrl}
                      className="media-zoom group relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--in)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pr)] disabled:cursor-default"
                      aria-label={
                        identified.facePhotoUrl
                          ? `View face photo for ${identified.reservation.operatorName}`
                          : 'No face photo on file'
                      }
                    >
                      {identified.facePhotoUrl ? (
                        <>
                          <RevealImage
                            src={identified.facePhotoUrl}
                            alt=""
                            h={96}
                            w={96}
                            fit="cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                            Tap to view
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center">
                          <span className="text-[24px] font-bold tracking-wide text-[var(--pr)]">
                            {identified.faceInitials}
                          </span>
                          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--mu)]">
                            No photo
                          </span>
                        </div>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--tx)]">
                        Compare with rider at the bay
                      </p>
                      <p className="mt-1 text-[12.5px] text-[var(--mu)]">
                        Tap the photo to open the document viewer.
                      </p>
                    </div>
                  </div>
                ) : null}

                {step === 'done' ? (
                  <p className="mt-4 border-t border-[var(--bd)] pt-3 text-[13px] font-semibold text-[#1B7A3E]">
                    Session complete
                  </p>
                ) : null}
              </section>
            ) : null}

            {identified && step === 'return' ? (
              <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
                <HubBatteryPicker
                  title="Return battery"
                  hint={
                    identified.expectedReturnSerial
                      ? `Expected mount ${identified.expectedReturnSerial} on ${identified.reservation.vehicleReg}.`
                      : `No mount on record — this session should have skipped return (first swap).`
                  }
                  options={returnCandidates}
                  valueId={returned?.id ?? null}
                  allowRegisterNew={false}
                  unknownBlockedMessage="Pack not the expected mount. Open an incident for mismatch / missing pack."
                  onChange={(b) => {
                    setReturned(b)
                    if (b && b.chargePct > 0) setReturnCharge(String(b.chargePct))
                  }}
                />
                <NumberInput
                  mt="sm"
                  label="Charge level (%)"
                  placeholder="Read from the pack gauge"
                  value={returnCharge}
                  onChange={(v) => setReturnCharge(String(v))}
                  min={0}
                  max={100}
                  clampBehavior="strict"
                  allowDecimal={false}
                  allowNegative={false}
                  error={returned && returnChargePct === null ? 'Enter 0–100' : undefined}
                  disabled={!returned}
                />
                <Button
                  mt="md"
                  color="brand"
                  disabled={
                    !returned || !swapSessionId || returnMut.isPending || returnChargePct === null
                  }
                  loading={returnMut.isPending}
                  onClick={() => {
                    primaryFooter.onClick()
                  }}
                >
                  Continue to issue
                </Button>
              </section>
            ) : null}

            {identified && step === 'issue' ? (
              <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
                <HubBatteryPicker
                  title="Issue battery"
                  hint={
                    identified.skipReturn
                      ? 'No pack on this vehicle — nothing to return. Pick a ready pack of its type.'
                      : hubReady.length
                        ? 'Charged pack matching this vehicle type at this hub.'
                        : 'No compatible ready pack at this hub.'
                  }
                  options={hubReady}
                  valueId={issued?.id ?? null}
                  allowRegisterNew={false}
                  unknownBlockedMessage="Pack must already be in hub inventory. Commission it under Batteries first."
                  onChange={(b) => setIssued(b)}
                />
                <Button
                  mt="md"
                  color="brand"
                  disabled={!issued || !swapSessionId || issueMut.isPending}
                  loading={issueMut.isPending}
                  onClick={() => {
                    primaryFooter.onClick()
                  }}
                >
                  Continue to confirm
                </Button>
              </section>
            ) : null}

            {identified && step === 'settle' && settlePlan ? (
              <HubSwapSettleSection
                plan={settlePlan}
                listDueNaira={listSwapDueNaira(
                  identified.vehicleType ?? identified.makeModel,
                )}
                mode={settleMode}
                onModeChange={(m) => {
                  setSettleMode(m)
                  setCashReceiptRef(null)
                  if (m !== 'WALLET') setTopUpRef(null)
                  setRiderPinGrant(null)
                  if (m === 'PLAN' && settleDiscount) {
                    setSettleDiscount(null)
                    pushLog('Discount', 'Cleared — plan allowance has no charge')
                  }
                  setIdentified({
                    ...identified,
                    paymentLabel: settleModeLabel(m),
                    needsSettlement:
                      m === 'CASH_AT_HUB' ||
                      m === 'PAYSTACK' ||
                      (m === 'WALLET' && identified.isWalkIn),
                  })
                  pushLog('Confirm', `Payment method: ${settleModeLabel(m)}`)
                }}
                topUpRef={topUpRef}
                onCollectTopUp={() => {
                  const due = settlePlan.dueNaira
                  const shortfall = Math.max(0, due - liveWalletNaira)
                  setTopUpRef('LIVE-TOPUP')
                  pushLog(
                    'Cash top-up',
                    `Will settle on complete · ${formatNaira(shortfall)} · TOP-UP`,
                  )
                }}
                cashReceiptRef={cashReceiptRef}
                onCollectCash={() => {
                  setCashReceiptRef('LIVE-CASH')
                  const note = appliedDiscount ? ` · ${appliedDiscount.code}` : ''
                  pushLog(
                    'Cash deposit',
                    `Posts on complete · ${formatNaira(settlePlan.dueNaira)}${note} · SWAP`,
                  )
                }}
                walletVisible={walletVisible}
                walletHeld={(identified.liveMeta?.holdAmountKobo ?? 0) > 0}
                discount={appliedDiscount}
                discountLocked={Boolean(bookedRedeem)}
                onDiscountChange={(next) => {
                  setSettleDiscount(next)
                  setCashReceiptRef(null)
                  setTopUpRef(null)
                  if (next) {
                    pushLog(
                      'Discount',
                      `${next.code} confirmed · save ${formatNaira(next.discountNaira)} · due ${formatNaira(next.dueNaira)}`,
                    )
                  } else {
                    pushLog('Discount', 'Code removed · list tariff restored')
                  }
                }}
                discountContext={{
                  vehicleCount: settleVehicleCount,
                  grantedDiscountId: undefined,
                }}
                onUseCashInstead={() => switchWalletToCash('Agent chose cash (no PIN)')}
                swapId={swapSessionId}
                onPaystackPaid={setPaystackPaid}
                onLog={pushLog}
              />
            ) : null}
          </div>

          <aside className="min-w-0 xl:sticky xl:top-2 xl:max-h-[calc(100vh-9rem)]">
            <AuditTrailRail
              title="Swap audit trail"
              alertTone={trailTone}
              items={trailItems}
              emptyLabel="Events appear here as you work the bay. Full history: open the completed swap → View audit log."
              maxHeight="calc(100vh - 9rem)"
              className="h-full"
            />
          </aside>
        </div>
      </SidebarFormLayout>

      <FilePreviewModal
        opened={faceViewerOpen}
        onClose={() => setFaceViewerOpen(false)}
        url={identified?.facePhotoUrl ?? null}
        title={`${identified?.reservation.operatorName ?? 'Operator'} · face on file`}
        preferImage
        contentType="image/jpeg"
      />

      <AdminConfirmModal
        opened={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setBayConfirm(null)
        }}
        title={
          bayConfirm === 'mismatch'
            ? 'Record identity mismatch?'
            : bayConfirm === 'override'
              ? 'Authorize supervisor override?'
              : bayConfirm === 'abort'
                ? 'Abort this swap?'
                : 'Complete swap?'
        }
        body={
          bayConfirm === 'mismatch'
            ? 'Blocks the swap and opens a path to file a support case. Choose why verification failed.'
            : bayConfirm === 'override'
              ? 'Allows the bay to continue despite a blocked triage band. Requires your agent PIN. PIN is never written to the audit trail.'
              : bayConfirm === 'abort'
                ? 'Clears issued packs for this session and returns to Identify. Custody is not finalized.'
                : identified && settlePlan
                  ? settleMode === 'CASH_AT_HUB'
                    ? `Collect ${formatNaira(settlePlan.dueNaira)} cash${appliedDiscount ? ` · ${appliedDiscount.code}` : ''}. Update custody.`
                    : settlePlan.riderPinRequired
                      ? `Wallet debit ${formatNaira(settlePlan.dueNaira)}${appliedDiscount ? ` · ${appliedDiscount.code}` : ''}. Ask the rider for their app PIN.`
                      : `${settlePlan.label}${appliedDiscount ? ` · ${appliedDiscount.code}` : ''}. Finish swap.`
                  : 'Finish swap.'
        }
        confirmLabel={
          bayConfirm === 'mismatch'
            ? 'Block swap'
            : bayConfirm === 'override'
              ? 'Authorize'
              : bayConfirm === 'abort'
                ? 'Abort swap'
                : 'Complete'
        }
        confirmTone={
          bayConfirm === 'mismatch' || bayConfirm === 'abort' ? 'danger' : 'primary'
        }
        reasonRequired={
          bayConfirm === 'mismatch' || bayConfirm === 'override' || bayConfirm === 'abort'
        }
        reasonLabel="Reason"
        reasonPlaceholder="Select a reason…"
        reasonOptions={
          bayConfirm === 'mismatch'
            ? [...HUB_MISMATCH_REASONS]
            : bayConfirm === 'override'
              ? [...HUB_OVERRIDE_REASONS]
              : bayConfirm === 'abort'
                ? [...HUB_ABORT_REASONS]
                : undefined
        }
        pinRequired={
          bayConfirm === 'override' ||
          (bayConfirm === 'complete' && Boolean(settlePlan?.riderPinRequired))
        }
        pinLength={4}
        pinMinLength={4}
        pinLabel={bayConfirm === 'override' ? 'Agent PIN' : 'Rider PIN'}
        pinHint={
          bayConfirm === 'complete' && settlePlan?.riderPinRequired
            ? 'Rider enters their app PIN. Not the agent PIN.'
            : bayConfirm === 'override'
              ? 'Your 4-digit agent PIN (My Profile → Security).'
              : undefined
        }
        pinLockedMessage={
          bayConfirm === 'complete'
            ? 'Rider PIN locked. Switch to cash to finish.'
            : undefined
        }
        pinAltAction={
          bayConfirm === 'complete' && settlePlan?.riderPinRequired
            ? {
                label: 'Collect cash instead',
                onClick: () => switchWalletToCash('Agent chose cash from Complete'),
              }
            : undefined
        }
        validatePin={async (pin) => {
          try {
            if (bayConfirm === 'override') {
              const res = await verifyAgentPin.mutateAsync({ pin })
              setAgentPinGrant(res.pin_grant)
              return true
            }
            if (bayConfirm === 'complete' && settlePlan?.riderPinRequired) {
              const accountId = identified?.liveMeta?.accountId
              if (!accountId) return false
              const res = await verifyRiderPin.mutateAsync({ account_id: accountId, pin })
              setRiderPinGrant(res.pin_grant)
              return true
            }
            return true
          } catch {
            return false
          }
        }}
        pinLocked={bayConfirm === 'override' ? pinLocked : false}
        onPinLockout={() => {
          if (bayConfirm === 'override') setPinLocked(true)
          else switchWalletToCash('Rider PIN lockout after wrong attempts')
        }}
        loading={
          startMut.isPending ||
          sessionCompleteMut.isPending ||
          abortMut.isPending ||
          identityMismatchMut.isPending ||
          verifyRiderPin.isPending ||
          verifyAgentPin.isPending ||
          recordOverride.isPending
        }
        illustrationId={
          bayConfirm === 'mismatch' || bayConfirm === 'abort'
            ? 'confirm-delete'
            : 'confirm-action'
        }
        onConfirm={onBayConfirm}
      />

      <KuraIllustrationModal
        opened={mismatchAckOpen}
        onClose={() => setMismatchAckOpen(false)}
        illustrationId="confirm-delete"
        title="Swap blocked"
        description={
          mismatchCaseQuery
            ? `${mismatchCaseQuery.reason}. Open a case so ops can follow up.`
            : 'Identity mismatch recorded.'
        }
        primaryAction={{
          label: 'Open case',
          onClick: () => {
            setMismatchAckOpen(false)
            if (!mismatchCaseQuery) return
            if (mismatchCaseQuery.caseId) {
              navigate(`/cases/${mismatchCaseQuery.caseId}`)
              return
            }
            const q = new URLSearchParams({
              subject: mismatchCaseQuery.subject,
              reason: mismatchCaseQuery.reason,
            })
            if (mismatchCaseQuery.accountId) {
              q.set('account', mismatchCaseQuery.accountId)
            }
            navigate(`/cases?${q.toString()}`)
          },
        }}
        secondaryAction={{
          label: 'Back to bay',
          onClick: () => setMismatchAckOpen(false),
        }}
      />

      <KuraIllustrationModal
        opened={successOpen}
        onClose={() => setSuccessOpen(false)}
        illustrationId="swap-complete"
        title="Swap completed"
        description={
          cashDepositRef
            ? `${identified?.reservation.code} done. ${cashDepositRef} cash logged on this shift.`
            : `${identified?.reservation.code} done. Receipt queued.`
        }
        primaryAction={{
          label: 'New session',
          onClick: () => {
            setSuccessOpen(false)
            resetSession()
          },
        }}
        secondaryAction={{
          label: 'Stay on bay',
          onClick: () => setSuccessOpen(false),
        }}
      />
    </>
  )
}
