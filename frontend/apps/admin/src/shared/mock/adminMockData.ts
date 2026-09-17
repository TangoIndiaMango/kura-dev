export interface HubRecord {
  id: string
  name: string
  location: string
  slots: number
  readyBatteries: number
  swapsToday: number
  solarCapacity: string
  agentOnDuty: string
  agentPhone: string
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
  lastSync: string
}

export interface BatteryRecord {
  id: string
  serial: string
  type: string
  location: string
  chargePct: number
  healthPct: number
  cycles: number
  voltage: string
  status: 'AVAILABLE' | 'CHARGING' | 'IN_FIELD' | 'MAINTENANCE' | 'RETIRED'
  lastFullCharge: string
}

export interface OperatorRecord {
  id: string
  kuraId: string
  name: string
  phone: string
  /** Login / invite channel — invite email sets app password. */
  email: string
  ninStatus: 'VERIFIED' | 'PENDING' | 'REJECTED'
  /** PENDING until operator accepts invite and sets password. */
  inviteStatus: 'PENDING' | 'ACCEPTED'
  vehicleType: 'Motorcycle' | 'Boat' | 'Tricycle'
  vehicleReg: string
  plan: 'Monthly' | 'Weekly' | 'Daily' | 'Pay-per-swap'
  walletBalance: number
  creditScore: number
  /** Face photo URL (Cloudinary / signed) for hub visual verify */
  photoUrl?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'DEREGISTERED'
  registeredDate: string
  /** Issued discount grant (code sent to rider) — never auto-applied at charge. */
  discountId?: string
}

export interface VehicleRecord {
  id: string
  regNumber: string
  vehicleType: 'Motorcycle' | 'Boat' | 'Tricycle'
  makeModel: string
  batteryType: string
  ownerName: string
  ownerKuraId: string
  hardwareId: string
  odometer: string
  telemetryStatus: 'LIVE' | 'STATIONARY' | 'OFFLINE'
  status: 'ACTIVE' | 'SERVICE_DUE' | 'SUSPENDED'
}

export interface AgentRecord {
  id: string
  name: string
  phone: string
  email: string
  hub: string
  /** Optional relief hub for cover shifts. */
  secondaryHub?: string
  deviceId: string
  onDuty: boolean
  overridesToday: number
  /** ACTIVE = operational · MAINTENANCE = device/PIN hold · INACTIVE = deactivated */
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  hiredDate: string
  lastSeen: string
  inviteStatus: 'ACTIVE' | 'PENDING'
}

export interface SwapRecord {
  id: string
  code: string
  time: string
  operatorName: string
  operatorPhone: string
  hubName: string
  batteryIn: string
  batteryOut: string
  chargeIn: number
  chargeOut: number
  planCovered: boolean
  paymentMethod: string
  amount: number
  status: 'COMPLETED' | 'OVERRIDE' | 'RESERVED' | 'FAILED'
}

export interface ReservationRecord {
  id: string
  code: string
  time: string
  operatorName: string
  hubName: string
  vehicleReg: string
  expiresIn: string
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  paymentMode: 'PLAN' | 'WALLET' | 'CREDIT' | 'CASH_AT_HUB'
  firstSwap?: boolean
}

export interface PaymentRecord {
  id: string
  reference: string
  date: string
  operatorName: string
  channel: 'Virtual Account' | 'Wallet Debit' | 'Cash at Hub' | 'Card' | 'USSD'
  purpose: 'Wallet Funding' | 'Battery Swap' | 'Plan Renewal' | 'Credit Repayment'
  amount: number
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'DISPUTED'
  /** List tariff before discount (when a code was confirmed). */
  listAmount?: number
  discountCode?: string
  discountAmount?: number
}

export interface AlertRecord {
  id: string
  raisedTime: string
  title: string
  subject: string
  severity: 'CRITICAL' | 'OPERATIONAL' | 'INFORMATIONAL'
  delivery: string
  age: string
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED'
}

export type AlertRuleSignal =
  | 'hub.last_sync_age'
  | 'hub.ready_count'
  | 'psp.webhook_fail_streak'
  | 'battery.soh_pct'

export type AlertRuleOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq'

export type AlertRuleChannel = 'dashboard' | 'sms' | 'whatsapp'

export interface AlertRuleRecord {
  id: string
  name: string
  /** Fixed evaluator signal — never free-text. */
  signal: AlertRuleSignal
  op: AlertRuleOp
  thresholdValue: number
  severity: 'CRITICAL' | 'OPERATIONAL' | 'INFORMATIONAL'
  scope: 'all' | 'hub' | 'region'
  channels: AlertRuleChannel[]
  /** Minutes before the same (rule, scope) can re-fire. */
  cooldownMinutes: number
  status: 'ACTIVE' | 'PAUSED'
}

export type CashReconStatus =
  | 'DEPOSIT_PENDING'
  | 'VARIANCE'
  | 'IN_REVIEW'
  | 'CLOSED'
  | 'CLOSED_SHORT'
  | 'REJECTED'

export interface CashMovement {
  id: string
  at: string
  kind: 'OPENING_FLOAT' | 'CASH_TAKE' | 'DEPOSIT'
  label: string
  reference: string
  amount: number
}

export interface CashAuditEvent {
  id: string
  at: string
  actor: string
  action: string
  detail: string
}

export interface CashReconRecord {
  id: string
  hubName: string
  agentName: string
  /** Starting float for the shift. */
  openingFloat: number
  /** System expected cash at close (float + cash takes − refunds). */
  expected: number
  /** Cash taken at hub during the shift. */
  collected: number
  /** Physical count if entered; null if not yet counted. */
  counted: number | null
  /** Amount lodged to bank / PSP agent deposit. */
  deposited: number
  /** deposited − expected (negative = shortage). */
  variance: number
  status: CashReconStatus
  asOf: string
  depositRef: string | null
  movements: CashMovement[]
  audit: CashAuditEvent[]
}


export interface CaseAttachment {
  id: string
  name: string
  contentType: string
  /** Signed delivery URL (mock: local public asset or blob). */
  url: string
  uploadedAt: string
  uploadedBy: string
}

export interface CaseEvent {
  id: string
  kind: 'NOTE' | 'STATUS' | 'ATTACHMENT'
  body?: string
  attachment?: CaseAttachment
  at: string
  actor: string
}

export interface CaseRecord {
  id: string
  code: string
  subject: string
  type: 'Dispute' | 'Support' | 'Billing' | 'Technical'
  operatorName: string
  assignee: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  openedAt: string
  /** Thread: notes, status changes, evidence uploads. */
  events?: CaseEvent[]
}

export interface ImpactStoryRecord {
  id: string
  title: string
  region: string
  metricHighlight: string
  partners: string
  publishedAt: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  summary: string
}

export interface EngineCustodyPhoto {
  id: 'hull' | 'petrol' | 'eboarder'
  title: string
  caption: string
  badge: string
  badgeTone?: 'success' | 'neutral'
  url: string
}

/** PRD 5.4 retrofit safety checklist — all must pass before /activate. */
export type EngineSafetyCheckId =
  | 'hull'
  | 'mount'
  | 'throttle'
  | 'kill'
  | 'cable'
  | 'float'

export type EngineSafetyChecks = Record<EngineSafetyCheckId, boolean>

export interface EngineRecord {
  id: string
  code: string
  /** Petrol unit label shown to the operator (e.g. Yamaha 15HP). */
  petrolLabel?: string
  petrolMake?: string
  petrolModel?: string
  petrolHp?: string
  conditionGrade?: string
  vehicleReg: string
  vehicleType: 'Motorcycle' | 'Tricycle' | 'Boat'
  ownerName: string
  hub: string
  category: 'STORED' | 'E_BOARDER' | 'RETROFIT'
  status: 'STORED' | 'RETURN_REQUESTED' | 'SAFETY_FAILED' | 'IN_QUEUE' | 'RELEASED'
  storedSince: string
  /** PRD 5.4 intake media — hull, surrendered ICE, mounted e-boarder. */
  custodyPhotos?: EngineCustodyPhoto[]
  /**
   * Checklist progress. Activation requires all six true.
   * Optional at intake queue — not a create blocker.
   */
  safetyChecks?: Partial<EngineSafetyChecks>
  activatedAt?: string
}

/** Default Path B vault set — petrol shot is what the operator app also shows. */
export function defaultEngineCustodyPhotos(input: {
  code: string
  vehicleReg: string
  petrolLabel?: string
}): EngineCustodyPhoto[] {
  return [
    {
      id: 'hull',
      title: 'Canoe Transom & Hull',
      caption: 'Waterline inspection',
      badge: 'Verified',
      badgeTone: 'neutral',
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=960&h=720&fit=crop&auto=format',
    },
    {
      id: 'petrol',
      title: 'Surrendered Petrol Engine',
      caption: input.petrolLabel
        ? `${input.petrolLabel} · ${input.code}`
        : input.code,
      badge: 'Tagged In Vault',
      badgeTone: 'neutral',
      url: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=960&h=720&fit=crop&auto=format',
    },
    {
      id: 'eboarder',
      title: 'E-Boarder Installed',
      caption: input.vehicleReg,
      badge: 'Active Mount',
      badgeTone: 'success',
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=960&h=720&fit=crop&auto=format',
    },
  ]
}

export function resolveEngineCustodyPhotos(
  engine: EngineRecord,
): EngineCustodyPhoto[] {
  if (engine.custodyPhotos?.length) return engine.custodyPhotos
  return defaultEngineCustodyPhotos({
    code: engine.code,
    vehicleReg: engine.vehicleReg,
    petrolLabel: engine.petrolLabel,
  })
}

export const MOCK_HUBS: HubRecord[] = [
  {
    id: 'HUB-YBA-01',
    name: 'Yaba Motor Park Mega Hub',
    location: '12 Herbert Macaulay Way, Yaba, Lagos',
    slots: 32,
    readyBatteries: 28,
    swapsToday: 112,
    solarCapacity: '12.5 kW',
    agentOnDuty: 'Tunde Bakare',
    agentPhone: '+234 803 412 1000',
    status: 'ONLINE',
    lastSync: '1 min ago',
  },
  {
    id: 'HUB-IKJ-02',
    name: 'Ikeja Along Station',
    location: 'Railway Line Corridor, Ikeja, Lagos',
    slots: 24,
    readyBatteries: 19,
    swapsToday: 84,
    solarCapacity: '10.0 kW',
    agentOnDuty: 'Blessing Okafor',
    agentPhone: '+234 802 991 3320',
    status: 'ONLINE',
    lastSync: 'Just now',
  },
  {
    id: 'HUB-OSH-03',
    name: 'Oshodi Transport Terminal Hub',
    location: 'Oshodi Interchange Terminal 2, Lagos',
    slots: 40,
    readyBatteries: 34,
    swapsToday: 146,
    solarCapacity: '18.0 kW',
    agentOnDuty: 'Chinedu Eze',
    agentPhone: '+234 814 550 1204',
    status: 'ONLINE',
    lastSync: '3 mins ago',
  },
  {
    id: 'HUB-IGB-01',
    name: 'Igbokoda Marine Waterfront Hub',
    location: 'Waterfront Jetty, Igbokoda, Ondo State',
    slots: 20,
    readyBatteries: 8,
    swapsToday: 32,
    solarCapacity: '15.0 kW',
    agentOnDuty: 'Fatima Bello',
    agentPhone: '+234 809 112 4432',
    status: 'MAINTENANCE',
    lastSync: '2h 14m ago',
  },
  {
    id: 'HUB-AJH-04',
    name: 'Ajah Junction Station',
    location: 'Lekki-Epe Expressway, Ajah, Lagos',
    slots: 24,
    readyBatteries: 21,
    swapsToday: 68,
    solarCapacity: '8.5 kW',
    agentOnDuty: 'Ibrahim Musa',
    agentPhone: '+234 805 771 9022',
    status: 'ONLINE',
    lastSync: '5 mins ago',
  },
  {
    id: 'HUB-M12-05',
    name: 'Mile 12 Market Depot',
    location: 'Ikorodu Road, Mile 12, Lagos',
    slots: 32,
    readyBatteries: 0,
    swapsToday: 18,
    solarCapacity: '10.5 kW',
    agentOnDuty: 'Amaka Nwosu',
    agentPhone: '+234 818 200 4511',
    status: 'OFFLINE',
    lastSync: '1h 10m ago',
  },
]

export const MOCK_BATTERIES: BatteryRecord[] = [
  {
    id: 'BAT-100240',
    serial: 'KUR-BAT-1049',
    type: 'Spiro Moto 48V',
    location: 'Yaba Motor Park Mega Hub',
    chargePct: 98,
    healthPct: 96,
    cycles: 142,
    voltage: '51.2 V',
    status: 'AVAILABLE',
    lastFullCharge: 'Today · 05:40',
  },
  {
    id: 'BAT-100241',
    serial: 'KUR-BAT-1055',
    type: 'Keke 60V',
    location: 'Yaba Motor Park Mega Hub',
    chargePct: 94,
    healthPct: 97,
    cycles: 88,
    voltage: '61.2 V',
    status: 'AVAILABLE',
    lastFullCharge: 'Today · 06:10',
  },
  {
    id: 'BAT-100277',
    serial: 'KUR-BAT-2088',
    type: 'Spiro Moto 48V',
    location: 'Ikeja Along Station',
    chargePct: 45,
    healthPct: 94,
    cycles: 88,
    voltage: '48.6 V',
    status: 'CHARGING',
    lastFullCharge: 'Yesterday · 18:20',
  },
  {
    id: 'BAT-100314',
    serial: 'KUR-BAT-3112',
    type: 'Asobo Marine 72V',
    location: 'Igbokoda Marine Waterfront Hub',
    chargePct: 82,
    healthPct: 91,
    cycles: 214,
    voltage: '74.4 V',
    status: 'AVAILABLE',
    lastFullCharge: 'Today · 07:15',
  },
  {
    id: 'BAT-100351',
    serial: 'KUR-BAT-4402',
    type: 'Keke 60V',
    location: 'Oshodi Transport Terminal Hub',
    chargePct: 18,
    healthPct: 58,
    cycles: 540,
    voltage: '57.8 V',
    status: 'MAINTENANCE',
    lastFullCharge: 'Aug 28, 2026',
  },
  {
    id: 'BAT-100388',
    serial: 'KUR-BAT-5091',
    type: 'Spiro Moto 48V',
    location: 'Vehicle: LSR-482-XA',
    chargePct: 62,
    healthPct: 95,
    cycles: 178,
    voltage: '49.8 V',
    status: 'IN_FIELD',
    lastFullCharge: 'Today · 06:14',
  },
  {
    id: 'BAT-100389',
    serial: 'KUR-BAT-5188',
    type: 'Keke 60V',
    location: 'Vehicle: AKD-771-KJ',
    chargePct: 41,
    healthPct: 93,
    cycles: 210,
    voltage: '58.4 V',
    status: 'IN_FIELD',
    lastFullCharge: 'Today · 05:50',
  },
  {
    id: 'BAT-100425',
    serial: 'KUR-BAT-6120',
    type: 'Asobo Marine 72V',
    location: 'Vehicle: HULL-IGB-14',
    chargePct: 89,
    healthPct: 97,
    cycles: 64,
    voltage: '75.2 V',
    status: 'IN_FIELD',
    lastFullCharge: 'Today · 05:00',
  },
]

export const MOCK_OPERATORS: OperatorRecord[] = [
  {
    id: 'OP-01',
    kuraId: 'KR-482100',
    name: 'Yusuf Abdullahi',
    phone: '+234 803 412 1000',
    email: 'yusuf.abdullahi@email.com',
    ninStatus: 'VERIFIED',
    inviteStatus: 'ACCEPTED',
    vehicleType: 'Motorcycle',
    vehicleReg: 'LSR-482-XA',
    plan: 'Monthly',
    walletBalance: 18450,
    creditScore: 74,
    status: 'ACTIVE',
    registeredDate: 'Mar 14, 2026',
    discountId: 'DSC-02',
    photoUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=640&fit=crop&auto=format',
  },
  {
    id: 'OP-02',
    kuraId: 'KR-482137',
    name: 'Blessing Okafor',
    phone: '+234 802 551 8912',
    email: 'blessing.okafor@email.com',
    ninStatus: 'VERIFIED',
    inviteStatus: 'ACCEPTED',
    vehicleType: 'Tricycle',
    vehicleReg: 'AKD-771-KJ',
    plan: 'Weekly',
    walletBalance: 6200,
    creditScore: 81,
    status: 'ACTIVE',
    registeredDate: 'Apr 02, 2026',
    discountId: 'DSC-01',
    photoUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=640&h=640&fit=crop&auto=format',
  },
  {
    id: 'OP-03',
    kuraId: 'KR-482174',
    name: 'Chief Adewale Ogundimu',
    phone: '+234 813 700 4421',
    email: 'adewale.ogundimu@email.com',
    ninStatus: 'VERIFIED',
    inviteStatus: 'ACCEPTED',
    vehicleType: 'Boat',
    vehicleReg: 'HULL-IGB-14',
    plan: 'Monthly',
    walletBalance: 34500,
    creditScore: 88,
    status: 'ACTIVE',
    registeredDate: 'Feb 19, 2026',
    photoUrl:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=640&h=640&fit=crop&auto=format',
  },
  {
    id: 'OP-04',
    kuraId: 'KR-482211',
    name: 'Chinedu Eze',
    phone: '+234 809 334 1109',
    email: 'chinedu.eze@email.com',
    ninStatus: 'VERIFIED',
    inviteStatus: 'ACCEPTED',
    vehicleType: 'Motorcycle',
    vehicleReg: 'KJA-209-BC',
    plan: 'Pay-per-swap',
    walletBalance: 450,
    creditScore: 52,
    status: 'SUSPENDED',
    registeredDate: 'May 10, 2026',
  },
  {
    id: 'OP-05',
    kuraId: 'KR-482248',
    name: 'Fatima Bello',
    phone: '+234 814 662 9011',
    email: 'fatima.bello@email.com',
    ninStatus: 'PENDING',
    inviteStatus: 'PENDING',
    vehicleType: 'Tricycle',
    vehicleReg: 'EPE-551-QW',
    plan: 'Weekly',
    walletBalance: 9800,
    creditScore: 79,
    status: 'ACTIVE',
    registeredDate: 'Jun 22, 2026',
    photoUrl:
      'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=640&h=640&fit=crop&auto=format',
  },
]

export const MOCK_VEHICLES: VehicleRecord[] = [
  {
    id: 'VEH-01',
    regNumber: 'LSR-482-XA',
    vehicleType: 'Motorcycle',
    makeModel: 'Spiro E-Moto Pro',
    batteryType: 'Spiro Moto 48V',
    ownerName: 'Yusuf Abdullahi',
    ownerKuraId: 'KR-482100',
    hardwareId: 'ENG-SPI-88421',
    odometer: '12,440 km',
    telemetryStatus: 'LIVE',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-02',
    regNumber: 'AKD-771-KJ',
    vehicleType: 'Tricycle',
    makeModel: 'TVS King EV',
    batteryType: 'Keke 60V',
    ownerName: 'Blessing Okafor',
    ownerKuraId: 'KR-482137',
    hardwareId: 'ENG-KEK-22019',
    odometer: '8,210 km',
    telemetryStatus: 'STATIONARY',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-03',
    regNumber: 'HULL-IGB-14',
    vehicleType: 'Boat',
    makeModel: 'Asobo E-Boarder',
    batteryType: 'Asobo Marine 72V',
    ownerName: 'Chief Adewale Ogundimu',
    ownerKuraId: 'KR-482174',
    hardwareId: 'ENG-ASO-11004',
    odometer: '1,980 hrs',
    telemetryStatus: 'LIVE',
    status: 'ACTIVE',
  },
  {
    id: 'VEH-04',
    regNumber: 'KJA-209-BC',
    vehicleType: 'Motorcycle',
    makeModel: 'Spiro E-Moto Lite',
    batteryType: 'Spiro Moto 48V',
    ownerName: 'Chinedu Eze',
    ownerKuraId: 'KR-482211',
    hardwareId: 'ENG-SPI-77102',
    odometer: '19,880 km',
    telemetryStatus: 'OFFLINE',
    status: 'SUSPENDED',
  },
  {
    id: 'VEH-05',
    regNumber: 'EPE-551-QW',
    vehicleType: 'Tricycle',
    makeModel: 'Bajaj RE EV',
    batteryType: 'Keke 60V',
    ownerName: 'Fatima Bello',
    ownerKuraId: 'KR-482248',
    hardwareId: 'ENG-KEK-33088',
    odometer: '5,640 km',
    telemetryStatus: 'LIVE',
    status: 'SERVICE_DUE',
  },
  {
    id: 'VEH-06',
    regNumber: 'APP-118-ZT',
    vehicleType: 'Motorcycle',
    makeModel: 'Spiro E-Moto Pro',
    batteryType: 'Spiro Moto 48V',
    ownerName: 'Ibrahim Musa',
    ownerKuraId: 'KR-482285',
    hardwareId: 'ENG-SPI-90211',
    odometer: '3,120 km',
    telemetryStatus: 'STATIONARY',
    status: 'ACTIVE',
  },
]

export const MOCK_AGENTS: AgentRecord[] = [
  {
    id: 'AGT-01',
    name: 'Tunde Bakare',
    phone: '+234 803 412 1000',
    email: 'tunde.bakare@kura.ops',
    hub: 'Yaba Motor Park Mega Hub',
    secondaryHub: 'Ikeja Along Station',
    deviceId: 'PAD-YBA-01',
    onDuty: true,
    overridesToday: 2,
    status: 'ACTIVE',
    hiredDate: 'Mar 12, 2025',
    lastSeen: '3 min ago',
    inviteStatus: 'ACTIVE',
  },
  {
    id: 'AGT-02',
    name: 'Blessing Okafor',
    phone: '+234 802 991 3320',
    email: 'blessing.okafor@kura.ops',
    hub: 'Ikeja Along Station',
    deviceId: 'PAD-IKJ-02',
    onDuty: true,
    overridesToday: 0,
    status: 'ACTIVE',
    hiredDate: 'Jan 8, 2025',
    lastSeen: '1 min ago',
    inviteStatus: 'ACTIVE',
  },
  {
    id: 'AGT-03',
    name: 'Chinedu Eze',
    phone: '+234 814 550 1204',
    email: 'chinedu.eze@kura.ops',
    hub: 'Oshodi Transport Terminal Hub',
    deviceId: 'PAD-OSH-03',
    onDuty: false,
    overridesToday: 5,
    status: 'ACTIVE',
    hiredDate: 'Nov 2, 2024',
    lastSeen: '2h ago',
    inviteStatus: 'ACTIVE',
  },
  {
    id: 'AGT-04',
    name: 'Fatima Bello',
    phone: '+234 809 112 4432',
    email: 'fatima.bello@kura.ops',
    hub: 'Igbokoda Marine Waterfront Hub',
    deviceId: 'PAD-IGB-01',
    onDuty: false,
    overridesToday: 1,
    status: 'MAINTENANCE',
    hiredDate: 'Jun 18, 2025',
    lastSeen: 'Yesterday',
    inviteStatus: 'ACTIVE',
  },
  {
    id: 'AGT-05',
    name: 'Ibrahim Musa',
    phone: '+234 805 771 9022',
    email: 'ibrahim.musa@kura.ops',
    hub: 'Ajah Junction Station',
    secondaryHub: 'Mile 12 Market Depot',
    deviceId: 'PAD-AJH-04',
    onDuty: true,
    overridesToday: 3,
    status: 'ACTIVE',
    hiredDate: 'Apr 4, 2025',
    lastSeen: '8 min ago',
    inviteStatus: 'ACTIVE',
  },
  {
    id: 'AGT-06',
    name: 'Amaka Nwosu',
    phone: '+234 818 200 4511',
    email: 'amaka.nwosu@kura.ops',
    hub: 'Mile 12 Market Depot',
    deviceId: 'PAD-M12-05',
    onDuty: false,
    overridesToday: 0,
    status: 'INACTIVE',
    hiredDate: 'Feb 20, 2025',
    lastSeen: 'Sep 1, 2026',
    inviteStatus: 'PENDING',
  },
]

export const MOCK_SWAPS: SwapRecord[] = [
  {
    id: 'SW-01',
    code: 'KB-4820',
    time: '07:02',
    operatorName: 'Yusuf Abdullahi',
    operatorPhone: '+234 803 412 1000',
    hubName: 'Yaba Motor Park Mega Hub',
    batteryIn: 'KUR-BAT-1049',
    batteryOut: 'KUR-BAT-5091',
    chargeIn: 18,
    chargeOut: 100,
    planCovered: true,
    paymentMethod: 'Monthly Plan Allowance',
    amount: 0,
    status: 'COMPLETED',
  },
  {
    id: 'SW-02',
    code: 'KB-4837',
    time: '07:45',
    operatorName: 'Blessing Okafor',
    operatorPhone: '+234 802 551 8912',
    hubName: 'Ikeja Along Station',
    batteryIn: 'KUR-BAT-2088',
    batteryOut: 'KUR-BAT-2099',
    chargeIn: 24,
    chargeOut: 100,
    planCovered: true,
    paymentMethod: 'Weekly Plan Allowance',
    amount: 0,
    status: 'COMPLETED',
  },
  {
    id: 'SW-03',
    code: 'KB-4854',
    time: '08:12',
    operatorName: 'Chinedu Eze',
    operatorPhone: '+234 809 334 1109',
    hubName: 'Oshodi Transport Terminal Hub',
    batteryIn: 'KUR-BAT-3301',
    batteryOut: 'KUR-BAT-3315',
    chargeIn: 8,
    chargeOut: 100,
    planCovered: false,
    paymentMethod: 'Agent Override (Compassionate)',
    amount: 1200,
    status: 'OVERRIDE',
  },
  {
    id: 'SW-04',
    code: 'KB-4871',
    time: '08:30',
    operatorName: 'Chief Adewale Ogundimu',
    operatorPhone: '+234 813 700 4421',
    hubName: 'Igbokoda Marine Waterfront Hub',
    batteryIn: 'KUR-BAT-3112',
    batteryOut: 'KUR-BAT-6120',
    chargeIn: 22,
    chargeOut: 100,
    planCovered: true,
    paymentMethod: 'Cooperative Bulk Plan',
    amount: 0,
    status: 'COMPLETED',
  },
]

export const MOCK_RESERVATIONS: ReservationRecord[] = [
  {
    id: 'RSV-01',
    code: 'KB-9A21',
    time: '09:15',
    operatorName: 'Yusuf Abdullahi',
    hubName: 'Yaba Motor Park Mega Hub',
    vehicleReg: 'LSR-482-XA',
    expiresIn: '8 min',
    status: 'ACTIVE',
    paymentMode: 'PLAN',
  },
  {
    id: 'RSV-02',
    code: 'KB-9B44',
    time: '09:02',
    operatorName: 'Blessing Okafor',
    hubName: 'Ikeja Along Station',
    vehicleReg: 'AKD-771-KJ',
    expiresIn: '—',
    status: 'EXPIRED',
    paymentMode: 'WALLET',
  },
  {
    id: 'RSV-02B',
    code: 'KB-9B90',
    time: '08:20',
    operatorName: 'Chinedu Eze',
    hubName: 'Yaba Motor Park Mega Hub',
    vehicleReg: 'KJA-209-BC',
    expiresIn: '—',
    status: 'EXPIRED',
    paymentMode: 'CASH_AT_HUB',
  },
  {
    id: 'RSV-03',
    code: 'KB-9C10',
    time: '08:48',
    operatorName: 'Fatima Bello',
    hubName: 'Ajah Junction Station',
    vehicleReg: 'EPE-551-QW',
    expiresIn: '—',
    status: 'CANCELLED',
    paymentMode: 'PLAN',
  },
  {
    id: 'RSV-04',
    code: 'KB-9D77',
    time: '10:05',
    operatorName: 'Chief Adewale Ogundimu',
    hubName: 'Igbokoda Marine Waterfront Hub',
    vehicleReg: 'HULL-IGB-14',
    expiresIn: '12 min',
    status: 'ACTIVE',
    paymentMode: 'CASH_AT_HUB',
    firstSwap: true,
  },
]

export const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'PAY-01',
    reference: 'PSP-9F3A2C',
    date: 'Today · 07:02',
    operatorName: 'Yusuf Abdullahi',
    channel: 'Virtual Account',
    purpose: 'Wallet Funding',
    amount: 15000,
    status: 'COMPLETED',
  },
  {
    id: 'PAY-02',
    reference: 'PSP-4B18DF',
    date: 'Today · 06:14',
    operatorName: 'Blessing Okafor',
    channel: 'Wallet Debit',
    purpose: 'Plan Renewal',
    amount: 4140,
    listAmount: 4500,
    discountCode: 'LOYAL-5',
    discountAmount: 360,
    status: 'COMPLETED',
  },
  {
    id: 'PAY-03',
    reference: 'PSP-7A99E1',
    date: 'Yesterday · 18:40',
    operatorName: 'Chinedu Eze',
    channel: 'Cash at Hub',
    purpose: 'Battery Swap',
    amount: 1350,
    listAmount: 1500,
    discountCode: 'SWAP-10',
    discountAmount: 150,
    status: 'COMPLETED',
  },
  {
    id: 'PAY-04',
    reference: 'PSP-1C22A0',
    date: 'Yesterday · 15:10',
    operatorName: 'Fatima Bello',
    channel: 'Card',
    purpose: 'Wallet Funding',
    amount: 10000,
    status: 'FAILED',
  },
  {
    id: 'PAY-05',
    reference: 'PSP-88C1B2',
    date: 'Today · 09:41',
    operatorName: 'Yusuf Abdullahi',
    channel: 'USSD',
    purpose: 'Credit Repayment',
    amount: 2500,
    status: 'PENDING',
  },
  {
    id: 'PAY-06',
    reference: 'PSP-55D0EE',
    date: 'Sep 3 · 11:20',
    operatorName: 'Chief Adewale Ogundimu',
    channel: 'Virtual Account',
    purpose: 'Wallet Funding',
    amount: 25000,
    status: 'REFUNDED',
  },
  {
    id: 'PAY-07',
    reference: 'PSP-D1SP7E',
    date: 'Sep 4 · 16:05',
    operatorName: 'Blessing Okafor',
    channel: 'Card',
    purpose: 'Plan Renewal',
    amount: 4500,
    status: 'DISPUTED',
  },
]

export const MOCK_ALERTS: AlertRecord[] = [
  {
    id: 'ALT-01',
    raisedTime: '6 mins ago',
    title: 'Hub offline — Mile 12 Market Depot',
    subject: 'HUB-M12-05',
    severity: 'CRITICAL',
    delivery: 'SMS to Ops Lead',
    age: '1h 10m',
    status: 'OPEN',
  },
  {
    id: 'ALT-02',
    raisedTime: '22 mins ago',
    title: '3 Webhook retries queued',
    subject: 'PSP Gateway Interswitch',
    severity: 'CRITICAL',
    delivery: 'Dashboard Alert',
    age: '22 min',
    status: 'OPEN',
  },
  {
    id: 'ALT-03',
    raisedTime: '45 mins ago',
    title: 'Low battery inventory — Oshodi Terminal',
    subject: 'Stock below safety threshold',
    severity: 'OPERATIONAL',
    delivery: 'WhatsApp + Dashboard',
    age: '45 min',
    status: 'ACKNOWLEDGED',
  },
  {
    id: 'ALT-04',
    raisedTime: '2 hours ago',
    title: 'Battery health degraded (<60%)',
    subject: 'KUR-BAT-4402 (58%)',
    severity: 'INFORMATIONAL',
    delivery: 'Maintenance Ticket',
    age: '2h 10m',
    status: 'OPEN',
  },
]

export const MOCK_ALERT_RULES: AlertRuleRecord[] = [
  {
    id: 'RULE-01',
    name: 'Hub offline',
    signal: 'hub.last_sync_age',
    op: 'gt',
    thresholdValue: 5,
    severity: 'CRITICAL',
    scope: 'all',
    channels: ['sms', 'dashboard'],
    cooldownMinutes: 30,
    status: 'ACTIVE',
  },
  {
    id: 'RULE-02',
    name: 'Low ready packs',
    signal: 'hub.ready_count',
    op: 'lt',
    thresholdValue: 4,
    severity: 'OPERATIONAL',
    scope: 'all',
    channels: ['whatsapp', 'dashboard'],
    cooldownMinutes: 60,
    status: 'ACTIVE',
  },
  {
    id: 'RULE-03',
    name: 'Webhook fail streak',
    signal: 'psp.webhook_fail_streak',
    op: 'gte',
    thresholdValue: 3,
    severity: 'CRITICAL',
    scope: 'all',
    channels: ['dashboard'],
    cooldownMinutes: 15,
    status: 'PAUSED',
  },
]

export const MOCK_CASH_RECON: CashReconRecord[] = [
  {
    id: 'CR-01',
    hubName: 'Yaba Motor Park Mega Hub',
    agentName: 'Tunde Bakare',
    openingFloat: 10000,
    expected: 84500,
    collected: 84500,
    counted: 10000,
    deposited: 84500,
    variance: 0,
    status: 'CLOSED',
    asOf: 'Today · 14:00',
    depositRef: 'DEP-YBA-9142',
    movements: [
      {
        id: 'M1',
        at: 'Today · 06:00',
        kind: 'OPENING_FLOAT',
        label: 'Opening float',
        reference: 'FLOAT-OPEN',
        amount: 10000,
      },
      {
        id: 'M2',
        at: 'Today · 07:02',
        kind: 'CASH_TAKE',
        label: 'Cash swap · Yusuf Abdullahi',
        reference: 'PSP-CASH-01',
        amount: 1200,
      },
      {
        id: 'M3',
        at: 'Today · 09:18',
        kind: 'CASH_TAKE',
        label: 'Wallet funding · walk-in',
        reference: 'PSP-CASH-02',
        amount: 15000,
      },
      {
        id: 'M4',
        at: 'Today · 11:40',
        kind: 'CASH_TAKE',
        label: 'Cash takes (batch)',
        reference: 'PSP-CASH-03',
        amount: 68300,
      },
      {
        id: 'M5',
        at: 'Today · 13:50',
        kind: 'DEPOSIT',
        label: 'PSP agent deposit',
        reference: 'DEP-YBA-9142',
        amount: -84500,
      },
    ],
    audit: [
      {
        id: 'A1',
        at: 'Today · 06:00',
        actor: 'Tunde Bakare',
        action: 'Shift opened',
        detail: 'Opening float ₦10,000',
      },
      {
        id: 'A2',
        at: 'Today · 13:50',
        actor: 'Tunde Bakare',
        action: 'Deposit confirmed',
        detail: 'DEP-YBA-9142 · ₦84,500',
      },
      {
        id: 'A3',
        at: 'Today · 14:00',
        actor: 'Adaora Okonkwo',
        action: 'Shift closed',
        detail: 'Expected matched deposit · variance ₦0',
      },
    ],
  },
  {
    id: 'CR-02',
    hubName: 'Ikeja Along Station',
    agentName: 'Blessing Okafor',
    openingFloat: 10000,
    expected: 61200,
    collected: 61200,
    counted: 13200,
    deposited: 58000,
    variance: -3200,
    status: 'VARIANCE',
    asOf: 'Today · 13:40',
    depositRef: 'DEP-IKJ-5521',
    movements: [
      {
        id: 'M1',
        at: 'Today · 06:05',
        kind: 'OPENING_FLOAT',
        label: 'Opening float',
        reference: 'FLOAT-OPEN',
        amount: 10000,
      },
      {
        id: 'M2',
        at: 'Today · 08:12',
        kind: 'CASH_TAKE',
        label: 'Plan renewal · cash',
        reference: 'PSP-CASH-11',
        amount: 4500,
      },
      {
        id: 'M3',
        at: 'Today · 10:30',
        kind: 'CASH_TAKE',
        label: 'Cash swaps (batch)',
        reference: 'PSP-CASH-12',
        amount: 28700,
      },
      {
        id: 'M4',
        at: 'Today · 12:05',
        kind: 'CASH_TAKE',
        label: 'Wallet funding · cash',
        reference: 'PSP-CASH-13',
        amount: 28000,
      },
      {
        id: 'M5',
        at: 'Today · 13:20',
        kind: 'DEPOSIT',
        label: 'PSP agent deposit',
        reference: 'DEP-IKJ-5521',
        amount: -58000,
      },
    ],
    audit: [
      {
        id: 'A1',
        at: 'Today · 06:05',
        actor: 'Blessing Okafor',
        action: 'Shift opened',
        detail: 'Opening float ₦10,000',
      },
      {
        id: 'A2',
        at: 'Today · 13:20',
        actor: 'Blessing Okafor',
        action: 'Deposit lodged',
        detail: 'DEP-IKJ-5521 · ₦58,000',
      },
      {
        id: 'A3',
        at: 'Today · 13:40',
        actor: 'System',
        action: 'Variance flagged',
        detail: 'Expected deposit ₦61,200 · lodged ₦58,000 · short ₦3,200',
      },
    ],
  },
  {
    id: 'CR-03',
    hubName: 'Oshodi Transport Terminal Hub',
    agentName: 'Chinedu Eze',
    openingFloat: 10000,
    expected: 102400,
    collected: 102400,
    counted: null,
    deposited: 0,
    variance: -102400,
    status: 'DEPOSIT_PENDING',
    asOf: 'Today · 12:15',
    depositRef: null,
    movements: [
      {
        id: 'M1',
        at: 'Today · 05:50',
        kind: 'OPENING_FLOAT',
        label: 'Opening float',
        reference: 'FLOAT-OPEN',
        amount: 10000,
      },
      {
        id: 'M2',
        at: 'Today · 07:40',
        kind: 'CASH_TAKE',
        label: 'Cash swaps (morning)',
        reference: 'PSP-CASH-21',
        amount: 52400,
      },
      {
        id: 'M3',
        at: 'Today · 11:10',
        kind: 'CASH_TAKE',
        label: 'Wallet funding · cash',
        reference: 'PSP-CASH-22',
        amount: 50000,
      },
    ],
    audit: [
      {
        id: 'A1',
        at: 'Today · 05:50',
        actor: 'Chinedu Eze',
        action: 'Shift opened',
        detail: 'Opening float ₦10,000',
      },
      {
        id: 'A2',
        at: 'Today · 12:15',
        actor: 'System',
        action: 'Deposit overdue',
        detail: '₦102,400 cash takes still on hand · no deposit lodged',
      },
    ],
  },
  {
    id: 'CR-04',
    hubName: 'Ajah Junction Station',
    agentName: 'Ibrahim Musa',
    openingFloat: 10000,
    expected: 38800,
    collected: 38800,
    counted: 10000,
    deposited: 38800,
    variance: 0,
    status: 'CLOSED',
    asOf: 'Yesterday · 18:00',
    depositRef: 'DEP-AJH-3301',
    movements: [
      {
        id: 'M1',
        at: 'Yesterday · 06:00',
        kind: 'OPENING_FLOAT',
        label: 'Opening float',
        reference: 'FLOAT-OPEN',
        amount: 10000,
      },
      {
        id: 'M2',
        at: 'Yesterday · 14:20',
        kind: 'CASH_TAKE',
        label: 'Cash takes (day)',
        reference: 'PSP-CASH-31',
        amount: 38800,
      },
      {
        id: 'M3',
        at: 'Yesterday · 17:40',
        kind: 'DEPOSIT',
        label: 'PSP agent deposit',
        reference: 'DEP-AJH-3301',
        amount: -38800,
      },
    ],
    audit: [
      {
        id: 'A1',
        at: 'Yesterday · 06:00',
        actor: 'Ibrahim Musa',
        action: 'Shift opened',
        detail: 'Opening float ₦10,000',
      },
      {
        id: 'A2',
        at: 'Yesterday · 17:40',
        actor: 'Ibrahim Musa',
        action: 'Deposit confirmed',
        detail: 'DEP-AJH-3301 · ₦38,800',
      },
      {
        id: 'A3',
        at: 'Yesterday · 18:00',
        actor: 'Adaora Okonkwo',
        action: 'Shift closed',
        detail: 'Balanced · variance ₦0',
      },
    ],
  },
  {
    id: 'CR-05',
    hubName: 'Mile 12 Market Depot',
    agentName: 'Fatima Bello',
    openingFloat: 10000,
    expected: 32000,
    collected: 32000,
    counted: 12000,
    deposited: 30000,
    variance: -2000,
    status: 'CLOSED_SHORT',
    asOf: 'Yesterday · 19:10',
    depositRef: 'DEP-M12-8810',
    movements: [
      {
        id: 'M1',
        at: 'Yesterday · 06:10',
        kind: 'OPENING_FLOAT',
        label: 'Opening float',
        reference: 'FLOAT-OPEN',
        amount: 10000,
      },
      {
        id: 'M2',
        at: 'Yesterday · 15:00',
        kind: 'CASH_TAKE',
        label: 'Cash takes (day)',
        reference: 'PSP-CASH-41',
        amount: 32000,
      },
      {
        id: 'M3',
        at: 'Yesterday · 18:30',
        kind: 'DEPOSIT',
        label: 'PSP agent deposit',
        reference: 'DEP-M12-8810',
        amount: -30000,
      },
    ],
    audit: [
      {
        id: 'A1',
        at: 'Yesterday · 06:10',
        actor: 'Fatima Bello',
        action: 'Shift opened',
        detail: 'Opening float ₦10,000',
      },
      {
        id: 'A2',
        at: 'Yesterday · 18:30',
        actor: 'Fatima Bello',
        action: 'Deposit lodged',
        detail: 'DEP-M12-8810 · ₦30,000',
      },
      {
        id: 'A3',
        at: 'Yesterday · 18:45',
        actor: 'System',
        action: 'Variance flagged',
        detail: 'Short ₦2,000 vs expected cash takes',
      },
      {
        id: 'A4',
        at: 'Yesterday · 19:10',
        actor: 'Adaora Okonkwo',
        action: 'Shortage accepted',
        detail: 'Within policy · miscount on change · closed short',
      },
    ],
  },
]

export const MOCK_CASES: CaseRecord[] = [
  {
    id: 'CASE-01',
    code: 'DS-2041',
    subject: 'Dispute on wallet debit PSP-9F3A2C',
    type: 'Dispute',
    operatorName: 'Yusuf Abdullahi',
    assignee: 'Amaka Nwosu',
    priority: 'HIGH',
    status: 'OPEN',
    openedAt: 'Today · 09:12',
    events: [
      {
        id: 'ce-01a',
        kind: 'STATUS',
        body: 'Case opened from payment dispute',
        at: 'Today · 09:12',
        actor: 'System',
      },
      {
        id: 'ce-01b',
        kind: 'ATTACHMENT',
        body: 'Bank alert screenshot',
        at: 'Today · 09:14',
        actor: 'Yusuf Abdullahi',
        attachment: {
          id: 'att-01',
          name: 'bank-alert.png',
          contentType: 'image/png',
          url: '/illustrations/payment-declined.png',
          uploadedAt: 'Today · 09:14',
          uploadedBy: 'Yusuf Abdullahi',
        },
      },
      {
        id: 'ce-01c',
        kind: 'NOTE',
        body: 'Operator contacted via in-app chat.',
        at: 'Today · 09:30',
        actor: 'Support',
      },
    ],
  },
  {
    id: 'CASE-02',
    code: 'SC-1188',
    subject: 'Unable to complete swap at Ikeja',
    type: 'Support',
    operatorName: 'Blessing Okafor',
    assignee: 'Tunde Bakare',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    openedAt: 'Yesterday · 16:40',
    events: [
      {
        id: 'ce-02a',
        kind: 'STATUS',
        body: 'Case opened',
        at: 'Yesterday · 16:40',
        actor: 'System',
      },
      {
        id: 'ce-02b',
        kind: 'ATTACHMENT',
        body: 'Bay photo',
        at: 'Yesterday · 16:45',
        actor: 'Blessing Okafor',
        attachment: {
          id: 'att-02',
          name: 'ikeja-bay.jpg',
          contentType: 'image/png',
          url: '/illustrations/hub-out-of-stock.png',
          uploadedAt: 'Yesterday · 16:45',
          uploadedBy: 'Blessing Okafor',
        },
      },
      {
        id: 'ce-02c',
        kind: 'NOTE',
        body: 'Agent en route — bay 4 reported jammed.',
        at: 'Yesterday · 17:05',
        actor: 'Tunde Bakare',
      },
    ],
  },
  {
    id: 'CASE-03',
    code: 'BL-0922',
    subject: 'Plan renewal charged twice',
    type: 'Billing',
    operatorName: 'Fatima Bello',
    assignee: 'Unassigned',
    priority: 'HIGH',
    status: 'OPEN',
    openedAt: 'Yesterday · 11:05',
    events: [
      {
        id: 'ce-03a',
        kind: 'STATUS',
        body: 'Case opened',
        at: 'Yesterday · 11:05',
        actor: 'System',
      },
    ],
  },
  {
    id: 'CASE-04',
    code: 'TC-0550',
    subject: 'Locker bay stuck open — Oshodi bay 12',
    type: 'Technical',
    operatorName: 'Hub Ops',
    assignee: 'Chinedu Eze',
    priority: 'MEDIUM',
    status: 'CLOSED',
    openedAt: 'Sep 2 · 08:20',
    events: [
      {
        id: 'ce-04a',
        kind: 'STATUS',
        body: 'Case opened',
        at: 'Sep 2 · 08:20',
        actor: 'System',
      },
      {
        id: 'ce-04b',
        kind: 'STATUS',
        body: 'Case closed — bay reset on site',
        at: 'Sep 2 · 11:40',
        actor: 'Chinedu Eze',
      },
    ],
  },
  {
    id: 'CASE-05',
    code: 'SC-1194',
    subject: 'Request PIN unlock after 3 fails',
    type: 'Support',
    operatorName: 'Chinedu Eze',
    assignee: 'Amaka Nwosu',
    priority: 'LOW',
    status: 'CLOSED',
    openedAt: 'Sep 1 · 19:55',
    events: [
      {
        id: 'ce-05a',
        kind: 'STATUS',
        body: 'Case opened',
        at: 'Sep 1 · 19:55',
        actor: 'System',
      },
      {
        id: 'ce-05b',
        kind: 'STATUS',
        body: 'PIN unlocked after face verify',
        at: 'Sep 1 · 20:10',
        actor: 'Amaka Nwosu',
      },
    ],
  },
]

export interface PriceRecord {
  id: string
  vehicleType: string
  daily: number
  weekly: number
  monthly: number
  payPerSwap: number
  effectiveDate: string
  status: 'ACTIVE' | 'PENDING' | 'SCHEDULED' | 'REJECTED' | 'APPROVED' | 'SUPERSEDED'
  /** Linked Approvals queue item when pending dual-control. */
  approvalId?: string
  /** Optional linked Discount rule (not free-text). */
  discountId?: string
}

export interface PlanRecord {
  id: string
  name: string
  /** Display / ledger code under the plan name in lists. */
  code: string
  vehicleType: 'Motorcycle' | 'Tricycle' | 'Boat'
  price: number
  period: 'day' | 'week' | 'month' | 'swap'
  description: string
  subscribers: number
  /** Active / Deactivated for publish state; Pending = dual-control edit. */
  status: 'ACTIVE' | 'DEACTIVATED' | 'PENDING'
  swapAllowance: number | 'unlimited'
  autoRenew: boolean
  durationLabel: string
  createdAt: string
  approvalId?: string
  /** Optional 30d revenue for plan overview (subscribers tab). */
  revenue30d?: number
  lapsed30d?: number
}

/** Operators currently (or recently) on a plan — Config · Plans · Subscribers. */
export interface PlanSubscriberRecord {
  id: string
  planId: string
  operatorName: string
  operatorId: string
  vehicleLabel: string
  paymentDate: string
  amount: number
  status: 'ACTIVE' | 'EXPIRED' | 'LAPSED'
}

export interface WebhookRecord {
  id: string
  event: string
  endpoint: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  attempts: number
  lastAt: string
  httpCode?: string
  payloadSummary?: string
}

export interface SettlementBatchRecord {
  id: string
  reference: string
  date: string
  amount: number
  status: 'POSTED' | 'PENDING' | 'FAILED'
  batches: number
}

export interface PspConnectionSettings {
  provider: string
  environment: 'Production' | 'Sandbox'
  merchantId: string
  apiKeyMasked: string
  webhookUrl: string
  vaPrefix: string
  settlementAccount: string
  lastKeyRotation: string
  connectionStatus: 'Online' | 'Degraded' | 'Offline'
  latencyMs: number
}

export interface UssdTemplateRecord {
  id: string
  code: string
  name: string
  /** Event that fires this message — hifi “Trigger”. */
  trigger: string
  channel: 'SMS' | 'USSD'
  language: string
  body: string
  status: 'ACTIVE' | 'DRAFT'
  updatedAt: string
}

export interface PspSettingRow {
  id: string
  setting: string
  value: string
  environment: string
  lastVerified: string
  status: 'Verified' | 'Applied' | 'Not Configured' | 'Degraded'
}

export interface UssdMenuNode {
  key: string
  label: string
  hint: string
  language: string
}

export interface UssdSessionDay {
  day: string
  started: number
  completed: number
  dropped: number
}

export interface UssdChannelConfig {
  shortcode: string
  sessionTimeoutSec: number
  callbackUrl: string
  gatewayNote: string
  provisioningStatus: 'Live' | 'Pending MNO' | 'Sandbox'
}

export interface AdminUserAuditEvent {
  id: string
  at: string
  actor: string
  action: string
  detail: string
}

export interface AdminUserRecord {
  id: string
  /** Human-facing staff code (ST-XXXXXX). UUID stays in `id` for routing. */
  publicId?: string
  name: string
  email: string
  phone: string
  role: string
  scope: string
  organisation: string
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REVOKED'
  lastLogin: string
  invitedAt: string
  mfaEnabled: boolean
  authMethod: string
  sessionTimeout: string
  audit: AdminUserAuditEvent[]
}


export interface NotificationRecord {
  id: string
  title: string
  body: string
  source: string
  sourcePath: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  status: 'UNREAD' | 'ACKED' | 'MUTED'
  receivedAt: string
}

export type ApprovalType = 'Tariff' | 'Credit' | 'Role' | 'Refund' | 'Plan' | 'Discount'

export interface ApprovalThreadMessage {
  id: string
  author: string
  role: string
  body: string
  at: string
  kind: 'request' | 'comment' | 'decision'
}

export interface ApprovalRecord {
  id: string
  code: string
  type: ApprovalType
  subject: string
  /** Where this change originated — approve applies back here on integration. */
  sourcePath: string
  sourceLabel: string
  /** RBAC code required to decide (module permission; Super Admin has all). */
  requiredPermission: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string
  /** Human rationale / policy note from the requester. */
  summary: string
  /** Scannable proposed change lines. */
  proposedChange: { label: string; value: string }[]
  thread: ApprovalThreadMessage[]
  decidedBy?: string
  decidedAt?: string
  decisionReason?: string
}

export interface AuditLogRecord {
  id: string
  action: string
  actor: string
  target: string
  ip: string
  at: string
  detail: string
}

export const MOCK_PRICES: PriceRecord[] = [
  {
    id: 'PRC-01',
    vehicleType: 'Electric Motorcycle (E-Moto)',
    daily: 1200,
    weekly: 6500,
    monthly: 24000,
    payPerSwap: 450,
    effectiveDate: 'Sep 1, 2026',
    status: 'ACTIVE',
    discountId: 'DSC-01',
  },
  {
    id: 'PRC-02',
    vehicleType: 'Electric Tricycle (Keke EV)',
    daily: 1800,
    weekly: 9500,
    monthly: 35000,
    payPerSwap: 650,
    effectiveDate: 'Sep 1, 2026',
    status: 'ACTIVE',
    discountId: 'DSC-01',
  },
  {
    id: 'PRC-03',
    vehicleType: 'Electric Outboard Boat (E-Boarder)',
    daily: 3500,
    weekly: 18000,
    monthly: 65000,
    payPerSwap: 1200,
    effectiveDate: 'Sep 1, 2026',
    status: 'ACTIVE',
  },
  {
    id: 'PRC-04',
    vehicleType: 'Electric Motorcycle — Peak tariff',
    daily: 1400,
    weekly: 7200,
    monthly: 26500,
    payPerSwap: 520,
    effectiveDate: 'Oct 1, 2026',
    status: 'PENDING',
    approvalId: 'APR-01',
  },
]

export const MOCK_PLANS: PlanRecord[] = [
  {
    id: 'PLN-01',
    name: 'Daily Pass',
    code: 'PLN-DAILY',
    vehicleType: 'Motorcycle',
    price: 1200,
    period: 'day',
    description: 'Includes 2 swaps per 24 hours. Lapses to pay-per-swap on expiry — no silent retry.',
    subscribers: 214,
    status: 'ACTIVE',
    swapAllowance: 2,
    autoRenew: false,
    durationLabel: '24 hours',
    createdAt: 'Jan 12, 2026',
    revenue30d: 4_280_000,
    lapsed30d: 18,
  },
  {
    id: 'PLN-02',
    name: 'Weekly Plan',
    code: 'PLN-WEEK',
    vehicleType: 'Motorcycle',
    price: 6500,
    period: 'week',
    description: 'Up to 14 swaps per week with auto-renew from wallet at the price effective on renewal.',
    subscribers: 486,
    status: 'ACTIVE',
    swapAllowance: 14,
    autoRenew: true,
    durationLabel: '7 days',
    createdAt: 'Jan 12, 2026',
    revenue30d: 18_650_000,
    lapsed30d: 22,
  },
  {
    id: 'PLN-03',
    name: 'Monthly Unlimited',
    code: 'PLN-MONTH',
    vehicleType: 'Motorcycle',
    price: 24000,
    period: 'month',
    description: 'Unlimited exchanges across all KURA stations in Nigeria.',
    subscribers: 402,
    status: 'ACTIVE',
    swapAllowance: 'unlimited',
    autoRenew: true,
    durationLabel: '30 days',
    createdAt: 'Feb 3, 2026',
    revenue30d: 32_100_000,
    lapsed30d: 12,
  },
  {
    id: 'PLN-04',
    name: 'Fleet Weekly (Partner)',
    code: 'PLN-FLEET-W',
    vehicleType: 'Tricycle',
    price: 5800,
    period: 'week',
    description: 'Partner fleet definition pending dual-control sign-off.',
    subscribers: 0,
    status: 'PENDING',
    swapAllowance: 12,
    autoRenew: true,
    durationLabel: '7 days',
    createdAt: 'Sep 1, 2026',
    approvalId: 'APR-05',
    revenue30d: 0,
    lapsed30d: 0,
  },
  {
    id: 'PLN-05',
    name: 'Pay-per-swap',
    code: 'PLN-PPS',
    vehicleType: 'Motorcycle',
    price: 450,
    period: 'swap',
    description: 'Default fallback when a timed plan expires. Charged per successful swap.',
    subscribers: 891,
    status: 'ACTIVE',
    swapAllowance: 1,
    autoRenew: false,
    durationLabel: 'Per swap',
    createdAt: 'Jan 12, 2026',
    revenue30d: 9_400_000,
    lapsed30d: 0,
  },
]

export const MOCK_PLAN_SUBSCRIBERS: PlanSubscriberRecord[] = [
  {
    id: 'PSUB-01',
    planId: 'PLN-03',
    operatorName: 'Chinedu Okeke',
    operatorId: 'KURA-OP-1042',
    vehicleLabel: 'E-Moto · ABC-452-LAG',
    paymentDate: 'Sep 1, 2026',
    amount: 24000,
    status: 'ACTIVE',
  },
  {
    id: 'PSUB-02',
    planId: 'PLN-03',
    operatorName: 'Amina Bello',
    operatorId: 'KURA-OP-1188',
    vehicleLabel: 'E-Moto · XYZ-991-ABJ',
    paymentDate: 'Aug 28, 2026',
    amount: 24000,
    status: 'ACTIVE',
  },
  {
    id: 'PSUB-03',
    planId: 'PLN-03',
    operatorName: 'Tunde Adeyemi',
    operatorId: 'KURA-OP-0912',
    vehicleLabel: 'Keke EV · KEK-220-IBD',
    paymentDate: 'Aug 4, 2026',
    amount: 24000,
    status: 'EXPIRED',
  },
  {
    id: 'PSUB-04',
    planId: 'PLN-02',
    operatorName: 'Ngozi Eze',
    operatorId: 'KURA-OP-1301',
    vehicleLabel: 'E-Moto · MTR-118-PHC',
    paymentDate: 'Sep 2, 2026',
    amount: 6500,
    status: 'ACTIVE',
  },
  {
    id: 'PSUB-05',
    planId: 'PLN-02',
    operatorName: 'Ibrahim Musa',
    operatorId: 'KURA-OP-0775',
    vehicleLabel: 'E-Boarder · BOAT-44-CAL',
    paymentDate: 'Aug 20, 2026',
    amount: 6500,
    status: 'LAPSED',
  },
  {
    id: 'PSUB-06',
    planId: 'PLN-01',
    operatorName: 'Funke Ade',
    operatorId: 'KURA-OP-1502',
    vehicleLabel: 'E-Moto · LAG-882-KD',
    paymentDate: 'Sep 4, 2026',
    amount: 1200,
    status: 'ACTIVE',
  },
]

export const MOCK_PSP_CONNECTION: PspConnectionSettings = {
  provider: 'Wema Bank NIP',
  environment: 'Production',
  merchantId: 'KURA-NG-00192',
  apiKeyMasked: 'wk_live_••••••••4f2a',
  webhookUrl: 'https://api.kura.ng/webhooks/wema',
  vaPrefix: '9971',
  settlementAccount: '0123456789 · Wema',
  lastKeyRotation: 'Aug 28, 2026',
  connectionStatus: 'Online',
  latencyMs: 42,
}

export const MOCK_PSP_SETTINGS: PspSettingRow[] = [
  {
    id: 'PS-01',
    setting: 'PSP provider',
    value: 'Wema Bank NIP',
    environment: 'Production',
    lastVerified: 'Sep 3, 2026',
    status: 'Verified',
  },
  {
    id: 'PS-02',
    setting: 'API key',
    value: '••••••••••••4F2A',
    environment: 'Production',
    lastVerified: 'Sep 3, 2026',
    status: 'Verified',
  },
  {
    id: 'PS-03',
    setting: 'Webhook URL',
    value: 'https://api.kura.ng/psp/webhook',
    environment: 'Production',
    lastVerified: 'Sep 3, 2026',
    status: 'Verified',
  },
  {
    id: 'PS-04',
    setting: 'Virtual account prefix',
    value: 'KURA /',
    environment: 'Production',
    lastVerified: '—',
    status: 'Applied',
  },
  {
    id: 'PS-05',
    setting: 'Settlement account',
    value: 'Not Configured',
    environment: 'Production',
    lastVerified: '—',
    status: 'Not Configured',
  },
  {
    id: 'PS-06',
    setting: 'Agent deposit API',
    value: 'Enabled',
    environment: 'Production',
    lastVerified: 'Sep 2, 2026',
    status: 'Verified',
  },
]

export const MOCK_WEBHOOKS: WebhookRecord[] = [
  {
    id: 'WH-01',
    event: 'charge.settled',
    endpoint: 'https://api.kura.ng/psp/webhook',
    status: 'SUCCESS',
    attempts: 1,
    lastAt: 'Today · 14:02',
    httpCode: '200',
    payloadSummary: 'Signing verified · Healthy',
  },
  {
    id: 'WH-02',
    event: 'charge.failed',
    endpoint: 'https://api.kura.ng/psp/webhook',
    status: 'SUCCESS',
    attempts: 1,
    lastAt: 'Today · 13:41',
    httpCode: '200',
    payloadSummary: 'Signing verified · Healthy',
  },
  {
    id: 'WH-03',
    event: 'transfer.in',
    endpoint: 'https://api.kura.ng/psp/webhook',
    status: 'FAILED',
    attempts: 6,
    lastAt: 'Today · 12:18',
    httpCode: '504',
    payloadSummary: 'Signing verified · Degraded',
  },
  {
    id: 'WH-04',
    event: 'settlement.posted',
    endpoint: 'https://api.kura.ng/psp/webhook',
    status: 'PENDING',
    attempts: 0,
    lastAt: 'Today · 11:55',
    payloadSummary: 'Awaiting delivery',
  },
  {
    id: 'WH-05',
    event: 'refund.completed',
    endpoint: 'https://api.kura.ng/psp/webhook',
    status: 'FAILED',
    attempts: 2,
    lastAt: 'Yesterday · 19:20',
    httpCode: '409',
    payloadSummary: 'Duplicate · retry queued',
  },
]

/** Webhook delivery volume — last 7 days (PSP chart). */
export const MOCK_WEBHOOK_SERIES = [
  { label: 'Mon', success: 412, failed: 8 },
  { label: 'Tue', success: 438, failed: 5 },
  { label: 'Wed', success: 401, failed: 12 },
  { label: 'Thu', success: 455, failed: 6 },
  { label: 'Fri', success: 490, failed: 9 },
  { label: 'Sat', success: 380, failed: 4 },
  { label: 'Sun', success: 356, failed: 7 },
]

export const MOCK_SETTLEMENT_BATCHES: SettlementBatchRecord[] = [
  {
    id: 'STL-01',
    reference: 'STL-992',
    date: 'Today · 11:55',
    amount: 4_200_000,
    status: 'POSTED',
    batches: 142,
  },
  {
    id: 'STL-02',
    reference: 'STL-991',
    date: 'Today · 06:10',
    amount: 318_000,
    status: 'PENDING',
    batches: 18,
  },
  {
    id: 'STL-03',
    reference: 'STL-988',
    date: 'Yesterday · 18:40',
    amount: 86_500,
    status: 'FAILED',
    batches: 3,
  },
  {
    id: 'STL-04',
    reference: 'STL-987',
    date: 'Yesterday · 11:02',
    amount: 3_910_000,
    status: 'POSTED',
    batches: 128,
  },
  {
    id: 'STL-05',
    reference: 'STL-980',
    date: 'Sep 3 · 12:05',
    amount: 5_140_000,
    status: 'POSTED',
    batches: 201,
  },
  {
    id: 'STL-06',
    reference: 'STL-974',
    date: 'Sep 2 · 11:48',
    amount: 2_880_000,
    status: 'POSTED',
    batches: 96,
  },
  {
    id: 'STL-07',
    reference: 'STL-968',
    date: 'Sep 1 · 18:22',
    amount: 412_000,
    status: 'POSTED',
    batches: 22,
  },
  {
    id: 'STL-08',
    reference: 'STL-961',
    date: 'Aug 31 · 11:40',
    amount: 3_650_000,
    status: 'POSTED',
    batches: 155,
  },
]

export const MOCK_USSD_CHANNEL: UssdChannelConfig = {
  shortcode: '*347*88#',
  sessionTimeoutSec: 90,
  callbackUrl: 'https://api.kura.ng/ussd/callback',
  gatewayNote:
    'Shortcode provisioning and MNO menu approval live in Africa’s Talking. KURA tracks sessions from callback logs; AT’s dashboard has high-level counts only — no rich analytics API.',
  provisioningStatus: 'Live',
}

export const MOCK_OPERATOR_MENU: UssdMenuNode[] = [
  { key: '1', label: 'Battery Swap', hint: 'Vehicle → hub → confirm', language: 'English' },
  { key: '2', label: 'My Plan', hint: 'View · renew · pay', language: 'English' },
  { key: '3', label: 'Fund Wallet', hint: 'Show NUBAN / STK push', language: 'English' },
  { key: '4', label: 'My Account', hint: 'Savings, vehicles, engine, help', language: 'English' },
]

export const MOCK_AGENT_MENU: UssdMenuNode[] = [
  { key: '1', label: 'Cash deposit', hint: 'Credit operator VA via PSP agent API', language: 'English' },
  { key: '2', label: 'Plan payment', hint: 'Cash plan renewal at hub', language: 'English' },
  { key: '3', label: 'Check operator', hint: 'Lookup by phone / KURA ID', language: 'English' },
  { key: '4', label: 'Recent transactions', hint: 'Last 5 at this agent', language: 'English' },
  { key: '5', label: 'Register operator', hint: 'Walk-up onboarding', language: 'English' },
]

/** From KURA USSD callback logs — not gateway analytics API. */
export const MOCK_USSD_SESSION_SERIES: UssdSessionDay[] = [
  { day: 'Mon', started: 1820, completed: 1540, dropped: 280 },
  { day: 'Tue', started: 1910, completed: 1620, dropped: 290 },
  { day: 'Wed', started: 1760, completed: 1480, dropped: 280 },
  { day: 'Thu', started: 2050, completed: 1740, dropped: 310 },
  { day: 'Fri', started: 2210, completed: 1880, dropped: 330 },
  { day: 'Sat', started: 1680, completed: 1390, dropped: 290 },
  { day: 'Sun', started: 1420, completed: 1180, dropped: 240 },
]

export const MOCK_TEMPLATES: UssdTemplateRecord[] = [
  {
    id: 'TMP-01',
    code: 'SWAP_CONFIRM',
    name: 'Swap confirmation',
    trigger: 'Swap completed',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: Swap done at {hub}. Battery {serial} issued. Plan: {plan}.',
    status: 'ACTIVE',
    updatedAt: 'Sep 2, 2026',
  },
  {
    id: 'TMP-02',
    code: 'PAYMENT_RECEIPT',
    name: 'Payment receipt',
    trigger: 'Payment completed',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: ₦{amount} received via {channel}. Ref {ref}. Balance ₦{balance}. Discount {code} −₦{saved} when applied.',
    status: 'ACTIVE',
    updatedAt: 'Sep 6, 2026',
  },
  {
    id: 'TMP-09',
    code: 'DISCOUNT_GRANTED',
    name: 'Discount code issued',
    trigger: 'Ops issues a discount to an operator',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: You have a discount — {name} ({value}). Code {code}. Enter it when you renew or swap. Valid until {endDate}.',
    status: 'ACTIVE',
    updatedAt: 'Sep 6, 2026',
  },
  {
    id: 'TMP-03',
    code: 'PLAN_EXPIRY',
    name: 'Plan expiry',
    trigger: 'Plan expires in 24h',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: Your {plan} plan expires {date}. Renew: dial *347*88#.',
    status: 'ACTIVE',
    updatedAt: 'Aug 30, 2026',
  },
  {
    id: 'TMP-04',
    code: 'RESERVE_HOLD',
    name: 'Reservation code',
    trigger: 'Reservation created',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: Battery reserved at {hub}. Code {code}. Hold 15 min.',
    status: 'ACTIVE',
    updatedAt: 'Aug 20, 2026',
  },
  {
    id: 'TMP-05',
    code: 'OTP',
    name: 'OTP',
    trigger: 'Sign-up / login',
    channel: 'SMS',
    language: 'English',
    body: 'KURA code: {otp}. Valid 5 min.',
    status: 'ACTIVE',
    updatedAt: 'Aug 18, 2026',
  },
  {
    id: 'TMP-06',
    code: 'RENEW_FAIL',
    name: 'Auto-renew failed',
    trigger: 'Renewal debit failed',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: Renewal failed. Plan lapsed to pay-per-swap. Fund wallet: {nuban}.',
    status: 'ACTIVE',
    updatedAt: 'Aug 28, 2026',
  },
  {
    id: 'TMP-07',
    code: 'CREDIT_EVENT',
    name: 'Credit events',
    trigger: 'Credit lifecycle',
    channel: 'SMS',
    language: 'English',
    body: 'KURA: ₦{amount} swap credit approved. Repay from wallet daily.',
    status: 'DRAFT',
    updatedAt: 'Sep 3, 2026',
  },
  {
    id: 'TMP-08',
    code: 'MENU_ROOT',
    name: 'USSD root menu',
    trigger: 'USSD session start',
    channel: 'USSD',
    language: 'English',
    body: '1. Swap  2. My Plan  3. Fund Wallet  4. My Account',
    status: 'ACTIVE',
    updatedAt: 'Sep 1, 2026',
  },
]

export const MOCK_USERS: AdminUserRecord[] = [
  {
    id: 'USR-01',
    name: 'Amaka Nwosu',
    email: 'amaka@yopmail.com',
    phone: '+234 803 100 2001',
    role: 'Super Admin',
    scope: 'Nationwide',
    organisation: 'KURA Energy Nigeria',
    status: 'ACTIVE',
    lastLogin: 'Today · 08:14',
    invitedAt: 'Jan 4 · 2025',
    mfaEnabled: true,
    authMethod: 'Email + password',
    sessionTimeout: '8 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Jan 4 · 2025',
        actor: 'System',
        action: 'Account created',
        detail: 'Super Admin · Nationwide',
      },
      {
        id: 'UA2',
        at: 'Jan 5 · 2025',
        actor: 'Amaka Nwosu',
        action: 'Invite accepted',
        detail: 'MFA enabled · TOTP',
      },
      {
        id: 'UA3',
        at: 'Today · 08:14',
        actor: 'Amaka Nwosu',
        action: 'Signed in',
        detail: 'Lagos · Chrome',
      },
    ],
  },
  {
    id: 'USR-02',
    name: 'Tunde Bakare',
    email: 'tunde@yopmail.com',
    phone: '+234 803 100 2002',
    role: 'Ops Manager',
    scope: 'Network-wide',
    organisation: 'KURA Energy Nigeria',
    status: 'ACTIVE',
    lastLogin: 'Today · 07:52',
    invitedAt: 'Mar 12 · 2025',
    mfaEnabled: true,
    authMethod: 'Email + password',
    sessionTimeout: '8 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Mar 12 · 2025',
        actor: 'Amaka Nwosu',
        action: 'Invite sent',
        detail: 'Ops Manager · Network-wide',
      },
      {
        id: 'UA2',
        at: 'Mar 13 · 2025',
        actor: 'Tunde Bakare',
        action: 'Invite accepted',
        detail: 'MFA enabled',
      },
      {
        id: 'UA3',
        at: 'Aug 28 · 2025',
        actor: 'Amaka Nwosu',
        action: 'Role confirmed',
        detail: 'Ops Manager retained',
      },
      {
        id: 'UA4',
        at: 'Today · 07:52',
        actor: 'Tunde Bakare',
        action: 'Signed in',
        detail: 'Ikeja · Safari',
      },
    ],
  },
  {
    id: 'USR-03',
    name: 'Chinedu Eze',
    email: 'chinedu@yopmail.com',
    phone: '+234 803 100 2003',
    role: 'Ops Agent',
    scope: 'Lagos',
    organisation: 'KURA Energy Nigeria',
    status: 'ACTIVE',
    lastLogin: 'Yesterday · 18:40',
    invitedAt: 'May 2 · 2025',
    mfaEnabled: true,
    authMethod: 'Email + password',
    sessionTimeout: '8 hours',
    audit: [
      {
        id: 'UA1',
        at: 'May 2 · 2025',
        actor: 'Tunde Bakare',
        action: 'Invite sent',
        detail: 'Ops Agent · Lagos',
      },
      {
        id: 'UA2',
        at: 'May 3 · 2025',
        actor: 'Chinedu Eze',
        action: 'Invite accepted',
        detail: 'MFA enabled',
      },
      {
        id: 'UA3',
        at: 'Jul 19 · 2025',
        actor: 'Tunde Bakare',
        action: 'Scope updated',
        detail: 'Lagos hubs only',
      },
    ],
  },
  {
    id: 'USR-04',
    name: 'Fatima Bello',
    email: 'fatima@yopmail.com',
    phone: '+234 803 100 2004',
    role: 'Commercial Admin',
    scope: 'Lagos',
    organisation: 'KURA Energy Nigeria',
    status: 'INVITED',
    lastLogin: 'Never',
    invitedAt: 'Sep 1 · 2026',
    mfaEnabled: false,
    authMethod: 'Invite pending',
    sessionTimeout: '8 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Sep 1 · 2026',
        actor: 'Amaka Nwosu',
        action: 'Invite sent',
        detail: 'Commercial Admin · Lagos · expires in 72h',
      },
    ],
  },
  {
    id: 'USR-05',
    name: 'Ibrahim Musa',
    email: 'ibrahim@yopmail.com',
    phone: '+234 803 100 2005',
    role: 'Ops Agent',
    scope: 'Ikeja Along',
    organisation: 'KURA Energy Nigeria',
    status: 'REVOKED',
    lastLogin: 'Aug 12 · 09:10',
    invitedAt: 'Apr 8 · 2025',
    mfaEnabled: true,
    authMethod: 'Email + password',
    sessionTimeout: '8 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Apr 8 · 2025',
        actor: 'Tunde Bakare',
        action: 'Invite sent',
        detail: 'Ops Agent · Ikeja Along',
      },
      {
        id: 'UA2',
        at: 'Apr 9 · 2025',
        actor: 'Ibrahim Musa',
        action: 'Invite accepted',
        detail: 'MFA enabled',
      },
      {
        id: 'UA3',
        at: 'Aug 12 · 09:40',
        actor: 'Amaka Nwosu',
        action: 'Access revoked',
        detail: 'Left station · sessions cleared',
      },
    ],
  },
  {
    id: 'USR-06',
    name: 'Ngozi Okeke',
    email: 'ngozi@yopmail.com',
    phone: '+234 803 100 2006',
    role: 'Government Partner',
    scope: 'Programme-specific',
    organisation: 'Lagos State Programme Office',
    status: 'ACTIVE',
    lastLogin: 'Aug 30 · 11:20',
    invitedAt: 'Jul 12 · 2025',
    mfaEnabled: true,
    authMethod: 'Email + password',
    sessionTimeout: '4 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Jul 12 · 2025',
        actor: 'Amaka Nwosu',
        action: 'Invite sent',
        detail: 'Government Partner · programme scope',
      },
      {
        id: 'UA2',
        at: 'Jul 14 · 2025',
        actor: 'Ngozi Okeke',
        action: 'Invite accepted',
        detail: 'Read-only access',
      },
    ],
  },
  {
    id: 'USR-07',
    name: 'Yusuf Abdullahi',
    email: 'yusuf@partner.ng',
    phone: '+234 803 100 2007',
    role: 'Hardware Partner',
    scope: 'Network-wide',
    organisation: 'Partner Hardware Co.',
    status: 'ACTIVE',
    lastLogin: 'Aug 28 · 16:05',
    invitedAt: 'Jul 4 · 2025',
    mfaEnabled: false,
    authMethod: 'Email + password',
    sessionTimeout: '4 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Jul 4 · 2025',
        actor: 'Amaka Nwosu',
        action: 'Invite sent',
        detail: 'Hardware Partner · network read',
      },
      {
        id: 'UA2',
        at: 'Jul 6 · 2025',
        actor: 'Yusuf Abdullahi',
        action: 'Invite accepted',
        detail: 'MFA not yet enabled',
      },
      {
        id: 'UA3',
        at: 'Aug 20 · 2025',
        actor: 'System',
        action: 'MFA reminder',
        detail: 'Partner accounts should enable MFA',
      },
    ],
  },
  {
    id: 'USR-08',
    name: 'Amina Sule',
    email: 'amina@igbokoda.coop',
    phone: '+234 803 100 2008',
    role: 'Cooperative Chairman',
    scope: 'Igbokoda Coop',
    organisation: 'Igbokoda Cooperative',
    status: 'INVITED',
    lastLogin: 'Never',
    invitedAt: 'Sep 3 · 2026',
    mfaEnabled: false,
    authMethod: 'Invite pending',
    sessionTimeout: '8 hours',
    audit: [
      {
        id: 'UA1',
        at: 'Sep 3 · 2026',
        actor: 'Tunde Bakare',
        action: 'Invite sent',
        detail: 'Cooperative Chairman · Igbokoda Coop',
      },
    ],
  },
]

export const MOCK_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'NTF-01',
    title: 'Hub offline — Igbokoda Waterfront',
    body: 'Last sync 2h 14m ago. SMS sent to ops lead.',
    source: 'Alerts',
    sourcePath: '/alerts',
    severity: 'CRITICAL',
    status: 'UNREAD',
    receivedAt: 'Today · 14:18',
  },
  {
    id: 'NTF-02',
    title: '3 webhook failures in 10 min',
    body: 'PSP gateway. Paid swaps queued.',
    source: 'PSP',
    sourcePath: '/psp',
    severity: 'WARNING',
    status: 'UNREAD',
    receivedAt: 'Today · 13:55',
  },
  {
    id: 'NTF-03',
    title: 'Low inventory — Oshodi Terminal',
    body: '4 ready · forecast 12 in next hour.',
    source: 'Hubs',
    sourcePath: '/hubs',
    severity: 'WARNING',
    status: 'UNREAD',
    receivedAt: 'Today · 13:40',
  },
  {
    id: 'NTF-04',
    title: 'Override threshold — Chinedu Eze',
    body: '3 overrides today. Review flagged.',
    source: 'Agents',
    sourcePath: '/agents',
    severity: 'WARNING',
    status: 'UNREAD',
    receivedAt: 'Today · 12:10',
  },
  {
    id: 'NTF-05',
    title: 'Cash reconciliation variance',
    body: 'Oshodi Terminal · −₦3,500 variance.',
    source: 'Payments',
    sourcePath: '/payments',
    severity: 'CRITICAL',
    status: 'UNREAD',
    receivedAt: 'Today · 11:02',
  },
  {
    id: 'NTF-06',
    title: 'Tariff change awaiting approval',
    body: 'Peak motorcycle tariff PRC-04 is pending finance sign-off.',
    source: 'Pricing',
    sourcePath: '/pricing/PRC-04',
    severity: 'WARNING',
    status: 'ACKED',
    receivedAt: 'Yesterday · 17:00',
  },
  {
    id: 'NTF-07',
    title: 'Quiet hours — overnight digest muted',
    body: 'Non-critical hub inventory pings paused until 06:00.',
    source: 'System',
    sourcePath: '/notifications',
    severity: 'INFO',
    status: 'MUTED',
    receivedAt: 'Yesterday · 22:10',
  },
]

export const MOCK_APPROVALS: ApprovalRecord[] = [
  {
    id: 'APR-01',
    code: 'AP-2201',
    type: 'Tariff',
    subject: 'Peak motorcycle tariff PRC-04',
    sourcePath: '/pricing',
    sourceLabel: 'Pricing · PRC-04',
    requiredPermission: 'approvals:decide',
    requestedBy: 'Fatima Bello',
    status: 'PENDING',
    submittedAt: 'Today · 10:40',
    summary:
      'Raise peak-window motorcycle rates ahead of Oct 1. Aligns app, USSD, and hub agent surfaces to one matrix.',
    proposedChange: [
      { label: 'Daily', value: '₦1,200 → ₦1,400' },
      { label: 'Weekly', value: '₦6,500 → ₦7,200' },
      { label: 'Pay-per-swap', value: '₦450 → ₦520' },
      { label: 'Effective', value: 'Oct 1, 2026' },
    ],
    thread: [
      {
        id: 't1',
        author: 'Fatima Bello',
        role: 'Commercial Admin',
        body: 'Submitting peak tariff for dual control. Weekend demand is outrunning current day-pass pricing; partners asked for a clearer peak band.',
        at: 'Today · 10:40',
        kind: 'request',
      },
      {
        id: 't2',
        author: 'Tunde Bakare',
        role: 'Ops Manager',
        body: 'Hub agents already briefed on Oct 1 cutover. Please keep USSD shortcode copy in sync when this goes live.',
        at: 'Today · 11:05',
        kind: 'comment',
      },
    ],
  },
  {
    id: 'APR-02',
    code: 'AP-2198',
    type: 'Credit',
    subject: 'Working capital CR-0931 · Yusuf Abdullahi',
    sourcePath: '/operators/OP-0931',
    sourceLabel: 'Operator · Yusuf Abdullahi',
    requiredPermission: 'credit:approve',
    requestedBy: 'Risk Desk',
    status: 'PENDING',
    submittedAt: 'Yesterday · 16:22',
    summary:
      'Operator requested ₦20,000 · 14-day tenor. Score above threshold; 92% on-time payments over 78 active days.',
    proposedChange: [
      { label: 'Amount', value: '₦20,000' },
      { label: 'Tenor', value: '14 days' },
      { label: 'Disburse as', value: 'Swap credit' },
      { label: 'Score', value: '74 · recommended ₦25,000' },
    ],
    thread: [
      {
        id: 't1',
        author: 'Risk Desk',
        role: 'System',
        body: 'Eligibility passed (60+ days, 80%+ on-time). Manual underwrite required before disbursement.',
        at: 'Yesterday · 16:22',
        kind: 'request',
      },
      {
        id: 't2',
        author: 'Chinedu Okeke',
        role: 'Risk Analyst',
        body: 'No open disputes. Last three weeks show steady swap volume. Comfortable at ₦20k with daily auto-debit.',
        at: 'Yesterday · 17:10',
        kind: 'comment',
      },
    ],
  },
  {
    id: 'APR-03',
    code: 'AP-2190',
    type: 'Role',
    subject: 'Invite Fatima Bello as Commercial Admin',
    sourcePath: '/users',
    sourceLabel: 'Users · invite',
    requiredPermission: 'approvals:decide',
    requestedBy: 'Amaka Nwosu',
    status: 'APPROVED',
    submittedAt: 'Sep 2 · 12:05',
    decidedBy: 'Amaka Nwosu',
    decidedAt: 'Sep 2 · 14:20',
    decisionReason: 'Commercial coverage for Lagos tariff work.',
    summary: 'Staff invite to Commercial Admin with finance read + tariff manage.',
    proposedChange: [
      { label: 'Invitee', value: 'Fatima Bello' },
      { label: 'Role', value: 'Commercial Admin' },
      { label: 'Email', value: 'fatima@kura.africa' },
    ],
    thread: [
      {
        id: 't1',
        author: 'Amaka Nwosu',
        role: 'Super Admin',
        body: 'Need a second commercial owner for tariff drafts. Fatima already shadowing pricing reviews.',
        at: 'Sep 2 · 12:05',
        kind: 'request',
      },
      {
        id: 't2',
        author: 'Amaka Nwosu',
        role: 'Super Admin',
        body: 'Approved — invite sent. Access applies on first sign-in.',
        at: 'Sep 2 · 14:20',
        kind: 'decision',
      },
    ],
  },
  {
    id: 'APR-04',
    code: 'AP-2184',
    type: 'Refund',
    subject: 'Refund PSP-9F3A2C · ₦2,400',
    sourcePath: '/payments/PSP-9F3A2C',
    sourceLabel: 'Payment · PSP-9F3A2C',
    requiredPermission: 'approvals:decide',
    requestedBy: 'Support',
    status: 'REJECTED',
    submittedAt: 'Sep 1 · 14:30',
    decidedBy: 'Amaka Nwosu',
    decidedAt: 'Sep 1 · 16:02',
    decisionReason: 'Duplicate of wallet top-up already reversed by PSP.',
    summary: 'Support requested full refund after operator reported a failed swap debit.',
    proposedChange: [
      { label: 'Amount', value: '₦2,400' },
      { label: 'Channel', value: 'Wallet debit' },
      { label: 'Operator', value: 'Ibrahim Musa' },
    ],
    thread: [
      {
        id: 't1',
        author: 'Adaeze Eze',
        role: 'Support',
        body: 'Operator insists the debit hit without a completed swap. Ticket CS-441.',
        at: 'Sep 1 · 14:30',
        kind: 'request',
      },
      {
        id: 't2',
        author: 'Amaka Nwosu',
        role: 'Super Admin',
        body: 'Rejected — PSP already reversed the same NUBAN credit. Point support to wallet ledger.',
        at: 'Sep 1 · 16:02',
        kind: 'decision',
      },
    ],
  },
  {
    id: 'APR-05',
    code: 'AP-2177',
    type: 'Plan',
    subject: 'Fleet Weekly partner plan PLN-04',
    sourcePath: '/pricing',
    sourceLabel: 'Plans · PLN-04',
    requiredPermission: 'approvals:decide',
    requestedBy: 'Commercial',
    status: 'PENDING',
    submittedAt: 'Aug 30 · 09:18',
    summary: 'New partner fleet weekly plan for 5+ vehicle accounts. Volume discount vs standard weekly.',
    proposedChange: [
      { label: 'Name', value: 'Fleet Weekly' },
      { label: 'Price', value: '₦5,800 / vehicle / week' },
      { label: 'Swaps', value: '12 included' },
      { label: 'Eligibility', value: '2+ vehicles on account' },
    ],
    thread: [
      {
        id: 't1',
        author: 'Commercial Desk',
        role: 'Commercial',
        body: 'Pilot with two fleet partners in Ikeja. Needs sign-off before the Fleet Weekly plan publishes.',
        at: 'Aug 30 · 09:18',
        kind: 'request',
      },
    ],
  },
  {
    id: 'APR-06',
    code: 'AP-2210',
    type: 'Discount',
    subject: 'Ramadan renewals DSC-03',
    sourcePath: '/discounts/DSC-03',
    sourceLabel: 'Discounts · DSC-03',
    requiredPermission: 'approvals:decide',
    requestedBy: 'Commercial',
    status: 'PENDING',
    submittedAt: 'Today · 08:12',
    summary:
      '20% off weekly/monthly renewals for all timed plans, 1 Mar–30 Mar 2026. Does not apply to pay-per-swap.',
    proposedChange: [
      { label: 'Code', value: 'RAMADAN-26' },
      { label: 'Value', value: '20%' },
      { label: 'Periods', value: 'Weekly · Monthly' },
      { label: 'Plans', value: 'All timed plans' },
      { label: 'Window', value: '1 Mar 2026 → 30 Mar 2026' },
    ],
    thread: [
      {
        id: 't1',
        author: 'Commercial Desk',
        role: 'Commercial',
        body: 'Seasonal renewal promo. Stacking disabled — highest single discount wins at charge time.',
        at: 'Today · 08:12',
        kind: 'request',
      },
    ],
  },
]

export const MOCK_AUDIT_LOG: AuditLogRecord[] = [
  {
    id: 'AUD-01',
    action: 'USER_ROLE_CHANGED',
    actor: 'Amaka Nwosu',
    target: 'Tunde Bakare',
    ip: '102.89.22.14',
    at: 'Today · 08:22',
    detail: 'Role updated to Operations Manager',
  },
  {
    id: 'AUD-02',
    action: 'TARIFF_APPROVED',
    actor: 'Amaka Nwosu',
    target: 'PRC-01',
    ip: '102.89.22.14',
    at: 'Sep 1 · 09:00',
    detail: 'E-Moto tariff matrix activated',
  },
  {
    id: 'AUD-03',
    action: 'OPERATOR_SUSPENDED',
    actor: 'Tunde Bakare',
    target: 'Yusuf Abdullahi',
    ip: '41.190.3.88',
    at: 'Yesterday · 15:41',
    detail: 'Reason: KYC mismatch flagged by risk',
  },
  {
    id: 'AUD-04',
    action: 'PSP_KEYS_ROTATED',
    actor: 'Amaka Nwosu',
    target: 'Wema NIP Gateway',
    ip: '102.89.22.14',
    at: 'Aug 28 · 11:12',
    detail: 'API keys rotated; old keys revoked',
  },
  {
    id: 'AUD-05',
    action: 'EXPORT_GENERATED',
    actor: 'Fatima Bello',
    target: 'Audit Trail',
    ip: '105.112.44.9',
    at: 'Aug 27 · 16:05',
    detail: 'CSV export of last 30 days',
  },
  {
    id: 'AUD-06',
    action: 'WEBHOOK_RETRIED',
    actor: 'System',
    target: 'WH-02',
    ip: '—',
    at: 'Today · 13:42',
    detail: 'Manual retry of payment.failed webhook',
  },
]

export interface SegmentRecord {
  id: string
  name: string
  status: 'ACTIVE' | 'DRAFT'
  covered: number
  largest: string
  updated: string
}

export interface ScoreRecord {
  id: string
  operator: string
  kuraId: string
  score: number
  eligible: boolean
  loans: number
  limitNaira: number
  status: 'ELIGIBLE' | 'BELOW_THRESHOLD' | 'OVERRIDE'
}

export interface OfferRecord {
  id: string
  name: string
  type: 'Credit' | 'Insurance' | 'Financing'
  segmentId: string
  segment: string
  /** Operator-facing one-liner (Wallet card). */
  summary: string
  /** Table / subtitle shorthand. */
  termsLabel: string
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ENDED'
  partnerName?: string
  /** False = show in admin, block apply until partner is live. */
  partnerConfigured: boolean
  /** Where funds / cover land after accept. */
  disbursement: 'SWAP_CREDIT' | 'WALLET_TOPUP' | 'PARTNER_POLICY' | 'PARTNER_REFERRAL'
  minAmountNaira?: number
  maxAmountNaira?: number
  tenorDays?: number[]
  /** e.g. 0.05 = 5% over the tenor window. */
  interestRate?: number
  premiumLabel?: string
  /** PRD assignment funnel counts. */
  funnelOffered: number
  funnelAccepted: number
  funnelActive: number
  funnelCompleted: number
  funnelDefaulted: number
}

/** Operator journey on an offer — PRD OfferAssignment statuses. */
export type OfferAssignmentStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DEFAULTED'

export interface OfferAssignmentRecord {
  id: string
  offerId: string
  operatorName: string
  operatorId: string
  kuraId: string
  status: OfferAssignmentStatus
  channel: 'App' | 'USSD'
  updatedAt: string
  amountNaira?: number
  note?: string
}


/** Campaign / rule discounts on plan renewals & swap charges — not Product Offers. */
export type DiscountValueType = 'PERCENT' | 'AMOUNT'
export type DiscountAudience = 'ALL' | 'SEGMENT' | 'FLEET'
export type DiscountPeriod = 'daily' | 'weekly' | 'monthly' | 'swap'
export type DiscountStatus =
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'PAUSED'
  | 'DRAFT'
  | 'PENDING'

export interface DiscountRecord {
  id: string
  name: string
  code: string
  valueType: DiscountValueType
  value: number
  startDate: string
  endDate: string
  status: DiscountStatus
  appliesToAllPlans: boolean
  /** Plan IDs when not all plans — pick from MOCK_PLANS. */
  planIds: string[]
  periods: DiscountPeriod[]
  audience: DiscountAudience
  segmentName?: string
  fleetMinVehicles?: number
  channels: string
  redemptions: number
  approvalId?: string
  summary: string
}

export interface CohortRecord {
  id: string
  name: string
  size: number
  m1: string
  m3: string
  m6: string
  arpu: number
  status: 'MATURE' | 'ACTIVE'
}

export interface RevenueVehicleRow {
  id: string
  vehicleType: string
  operators: number
  mrr: number
  arpu: number
  churn: string
  /** Estimated network COGS allocated per vehicle type (mock). */
  cogsNaira: number
  swapsPerOperator30d: number
}

/** Admin-tunable analytics assumptions (View E style — no code deploy). */
/** What numerator feeds ARPU (Average Revenue Per Operator). */
export type RevenueArpuBasis = 'mrr' | 'energy'

export interface RevenueAnalyticsSettings {
  latilaSharePct: number
  emicraftSharePct: number
  vatPct: number
  /**
   * ARPU = numerator ÷ active operators.
   * mrr — recurring plans only (default, matches KPI).
   * energy — plans + pay-per-swap (full Energy layer).
   */
  arpuBasis: RevenueArpuBasis
  /** Months used in LTV = ARPU × horizon × retention factor. */
  ltvHorizonMonths: number
  /** Blended survival into the LTV horizon (percent). */
  ltvRetentionFactorPct: number
  churnWarnPct: number
  renewalTargetPct: number
}

/** Monthly inputs for true ARPU — never gross ÷ operators. */
export interface RevenueArpuMonth {
  label: string
  mrrNaira: number
  /** Plan subscriptions + pay-per-swap for the month. */
  energyNaira: number
  activeOperators: number
}

export type RevenueLayer = 'Energy' | 'Finance' | 'Data'

export interface RevenueStreamRow {
  id: string
  layer: RevenueLayer
  metric: string
  amountNaira: number
  /**
   * SOW 6.3: subscription, PPS, credit margins share.
   * Data licensing / grants / hardware do not.
   */
  shareable: boolean
}

export interface RevenueChannelRow {
  id: string
  channel: string
  amountNaira: number
  txCount: number
}

export interface RevenueMonthPoint {
  label: string
  /** ₦ millions for chart readability */
  energy: number
  finance: number
  /** Data-layer revenue (licensing). Key must not be `data` — clashes with Recharts. */
  licensing: number
}

export interface RevenueCollectionsSnapshot {
  outstandingNaira: number
  renewalRatePct: number
  churn30dPct: number
  agentCashUnreconciledNaira: number
  activeOperators: number
  mrrNaira: number
}

export const MOCK_SEGMENTS: SegmentRecord[] = [
  {
    id: 'SEG-01',
    name: 'High-tenure riders',
    status: 'ACTIVE',
    covered: 612,
    largest: 'Tenure ≥ 90d · on-time ≥ 85%',
    updated: 'Today · 08:40',
  },
  {
    id: 'SEG-02',
    name: 'Lagos keke weekly',
    status: 'ACTIVE',
    covered: 522,
    largest: 'Tricycle · Weekly · Lagos',
    updated: 'Today · 07:15',
  },
  {
    id: 'SEG-03',
    name: 'Igbokoda fishermen',
    status: 'ACTIVE',
    covered: 432,
    largest: 'Boat · Cooperative member',
    updated: 'Yesterday · 18:20',
  },
  {
    id: 'SEG-04',
    name: 'At-risk (14d inactive)',
    status: 'ACTIVE',
    covered: 342,
    largest: 'No swap 14+ days',
    updated: 'Today · 09:02',
  },
  {
    id: 'SEG-05',
    name: 'Credit-eligible',
    status: 'DRAFT',
    covered: 252,
    largest: 'Score ≥ 65 · tenure ≥ 60d',
    updated: 'Sep 2 · 14:10',
  },
  {
    id: 'SEG-06',
    name: 'Fleet accounts',
    status: 'DRAFT',
    covered: 162,
    largest: '2+ vehicles linked',
    updated: 'Sep 1 · 11:45',
  },
]

export const MOCK_SCORES: ScoreRecord[] = [
  {
    id: 'SCR-01',
    operator: 'Yusuf Abdullahi',
    kuraId: 'KURA-10041',
    score: 82,
    eligible: true,
    loans: 1,
    limitNaira: 50000,
    status: 'ELIGIBLE',
  },
  {
    id: 'SCR-02',
    operator: 'Blessing Okafor',
    kuraId: 'KURA-10088',
    score: 76,
    eligible: true,
    loans: 0,
    limitNaira: 45000,
    status: 'ELIGIBLE',
  },
  {
    id: 'SCR-03',
    operator: 'Fatima Bello',
    kuraId: 'KURA-10112',
    score: 70,
    eligible: true,
    loans: 1,
    limitNaira: 40000,
    status: 'ELIGIBLE',
  },
  {
    id: 'SCR-04',
    operator: 'Chinedu Eze',
    kuraId: 'KURA-10055',
    score: 64,
    eligible: false,
    loans: 0,
    limitNaira: 35000,
    status: 'BELOW_THRESHOLD',
  },
  {
    id: 'SCR-05',
    operator: 'Amaka Nwosu',
    kuraId: 'KURA-10201',
    score: 58,
    eligible: true,
    loans: 2,
    limitNaira: 30000,
    status: 'ELIGIBLE',
  },
  {
    id: 'SCR-06',
    operator: 'Ibrahim Musa',
    kuraId: 'KURA-10019',
    score: 52,
    eligible: true,
    loans: 1,
    limitNaira: 25000,
    status: 'OVERRIDE',
  },
  {
    id: 'SCR-07',
    operator: 'Tunde Bakare',
    kuraId: 'KURA-10330',
    score: 46,
    eligible: true,
    loans: 0,
    limitNaira: 20000,
    status: 'ELIGIBLE',
  },
  {
    id: 'SCR-08',
    operator: 'Ngozi Okeke',
    kuraId: 'KURA-10402',
    score: 40,
    eligible: false,
    loans: 0,
    limitNaira: 15000,
    status: 'BELOW_THRESHOLD',
  },
]

export const MOCK_CREDIT_SETTINGS = [
  { id: 'cs1', factor: 'On-time repayment', weight: '30%', floor: '70%' },
  { id: 'cs2', factor: 'Tenure (days active)', weight: '25%', floor: '60d' },
  { id: 'cs3', factor: 'Swap frequency', weight: '20%', floor: '8 / wk' },
  { id: 'cs4', factor: 'Wallet funding consistency', weight: '15%', floor: '3 / mo' },
  { id: 'cs5', factor: 'Dispute / override rate', weight: '10%', floor: '< 2%' },
]

export const MOCK_OFFERS: OfferRecord[] = [
  {
    id: 'OFF-01',
    name: 'Working capital · Tier 1',
    type: 'Credit',
    segmentId: 'SEG-01',
    segment: 'High-tenure riders',
    summary: 'Borrow ₦5k–₦50k for swaps and plans. Daily wallet auto-debit.',
    termsLabel: '₦5k–₦50k · 7/14/30d · 5%',
    status: 'ACTIVE',
    partnerConfigured: true,
    disbursement: 'SWAP_CREDIT',
    minAmountNaira: 5000,
    maxAmountNaira: 50000,
    tenorDays: [7, 14, 30],
    interestRate: 0.05,
    funnelOffered: 612,
    funnelAccepted: 240,
    funnelActive: 210,
    funnelCompleted: 168,
    funnelDefaulted: 12,
  },
  {
    id: 'OFF-02',
    name: 'Working capital · Tier 2',
    type: 'Credit',
    segmentId: 'SEG-05',
    segment: 'Credit-eligible',
    summary: 'Smaller line for newer credit-eligible riders.',
    termsLabel: '₦5k–₦20k · 7/14d · 5%',
    status: 'ACTIVE',
    partnerConfigured: true,
    disbursement: 'SWAP_CREDIT',
    minAmountNaira: 5000,
    maxAmountNaira: 20000,
    tenorDays: [7, 14],
    interestRate: 0.05,
    funnelOffered: 318,
    funnelAccepted: 101,
    funnelActive: 86,
    funnelCompleted: 54,
    funnelDefaulted: 8,
  },
  {
    id: 'OFF-03',
    name: 'Parametric weather cover',
    type: 'Insurance',
    segmentId: 'SEG-03',
    segment: 'Igbokoda fishermen',
    summary: 'Weather-triggered payout for fishing days lost.',
    termsLabel: 'Partner pending',
    status: 'PAUSED',
    partnerName: 'Not configured',
    partnerConfigured: false,
    disbursement: 'PARTNER_POLICY',
    premiumLabel: 'Partner sets premium',
    funnelOffered: 183,
    funnelAccepted: 0,
    funnelActive: 0,
    funnelCompleted: 0,
    funnelDefaulted: 0,
  },
  {
    id: 'OFF-04',
    name: 'E-Moto financing referral',
    type: 'Financing',
    segmentId: 'SEG-02',
    segment: 'Lagos keke weekly',
    summary: 'Apply with our financing partner for an e-moto.',
    termsLabel: 'Partner pending',
    status: 'DRAFT',
    partnerName: 'Not configured',
    partnerConfigured: false,
    disbursement: 'PARTNER_REFERRAL',
    funnelOffered: 0,
    funnelAccepted: 0,
    funnelActive: 0,
    funnelCompleted: 0,
    funnelDefaulted: 0,
  },
  {
    id: 'OFF-05',
    name: 'Keke battery insurance',
    type: 'Insurance',
    segmentId: 'SEG-06',
    segment: 'Fleet accounts',
    summary: 'Monthly cover for fleet battery damage and loss.',
    termsLabel: 'Ended · was ₦2,500/mo',
    status: 'ENDED',
    partnerName: 'Leadway',
    partnerConfigured: true,
    disbursement: 'PARTNER_POLICY',
    premiumLabel: '₦2,500 / mo',
    funnelOffered: 94,
    funnelAccepted: 41,
    funnelActive: 0,
    funnelCompleted: 38,
    funnelDefaulted: 0,
  },
  {
    id: 'OFF-06',
    name: 'Cooperative working capital',
    type: 'Credit',
    segmentId: 'SEG-03',
    segment: 'Igbokoda fishermen',
    summary: 'Shared credit line for cooperative members.',
    termsLabel: 'Draft · terms TBD',
    status: 'DRAFT',
    partnerConfigured: true,
    disbursement: 'WALLET_TOPUP',
    minAmountNaira: 10000,
    maxAmountNaira: 100000,
    tenorDays: [14, 30],
    interestRate: 0.04,
    funnelOffered: 0,
    funnelAccepted: 0,
    funnelActive: 0,
    funnelCompleted: 0,
    funnelDefaulted: 0,
  },
]

export const MOCK_OFFER_ASSIGNMENTS: OfferAssignmentRecord[] = [
  {
    id: 'OA-01',
    offerId: 'OFF-01',
    operatorName: 'Yusuf Abdullahi',
    operatorId: 'OP-01',
    kuraId: 'KURA-10041',
    status: 'ACTIVE',
    channel: 'App',
    updatedAt: 'Today · 07:10',
    amountNaira: 20000,
    note: '14-day tenor · daily debit',
  },
  {
    id: 'OA-02',
    offerId: 'OFF-01',
    operatorName: 'Blessing Okafor',
    operatorId: 'OP-02',
    kuraId: 'KURA-10088',
    status: 'OFFERED',
    channel: 'App',
    updatedAt: 'Yesterday · 16:22',
  },
  {
    id: 'OA-03',
    offerId: 'OFF-01',
    operatorName: 'Fatima Bello',
    operatorId: 'OP-03',
    kuraId: 'KURA-10112',
    status: 'ACCEPTED',
    channel: 'USSD',
    updatedAt: 'Yesterday · 11:05',
    amountNaira: 15000,
  },
  {
    id: 'OA-04',
    offerId: 'OFF-01',
    operatorName: 'Ibrahim Musa',
    operatorId: 'OP-06',
    kuraId: 'KURA-10019',
    status: 'COMPLETED',
    channel: 'App',
    updatedAt: 'Aug 28 · 09:40',
    amountNaira: 30000,
  },
  {
    id: 'OA-05',
    offerId: 'OFF-01',
    operatorName: 'Chinedu Eze',
    operatorId: 'OP-04',
    kuraId: 'KURA-10055',
    status: 'DEFAULTED',
    channel: 'App',
    updatedAt: 'Aug 12 · 14:18',
    amountNaira: 10000,
    note: 'Grace expired · collections',
  },
  {
    id: 'OA-06',
    offerId: 'OFF-02',
    operatorName: 'Amaka Nwosu',
    operatorId: 'OP-05',
    kuraId: 'KURA-10201',
    status: 'ACTIVE',
    channel: 'App',
    updatedAt: 'Today · 08:02',
    amountNaira: 10000,
  },
  {
    id: 'OA-07',
    offerId: 'OFF-02',
    operatorName: 'Tunde Bakare',
    operatorId: 'OP-07',
    kuraId: 'KURA-10330',
    status: 'OFFERED',
    channel: 'USSD',
    updatedAt: 'Sep 4 · 19:11',
  },
]


export const MOCK_DISCOUNTS: DiscountRecord[] = [
  {
    id: 'DSC-01',
    name: 'Fleet volume · 5+',
    code: 'FLEET-8',
    valueType: 'PERCENT',
    value: 8,
    startDate: 'Sep 1, 2026',
    endDate: 'Dec 31, 2026',
    status: 'ACTIVE',
    appliesToAllPlans: true,
    planIds: [],
    periods: ['weekly', 'monthly'],
    audience: 'FLEET',
    fleetMinVehicles: 5,
    channels: 'App · USSD · Hub',
    redemptions: 412,
    summary: '8% off weekly/monthly renewals when the account has 5+ active vehicles.',
  },
  {
    id: 'DSC-02',
    name: 'High-tenure loyalty',
    code: 'LOYAL-5',
    valueType: 'PERCENT',
    value: 5,
    startDate: 'Aug 1, 2026',
    endDate: 'Nov 30, 2026',
    status: 'ACTIVE',
    appliesToAllPlans: false,
    planIds: ['PLN-02', 'PLN-03'],
    periods: ['weekly', 'monthly'],
    audience: 'SEGMENT',
    segmentName: 'High-tenure riders',
    channels: 'App · USSD',
    redemptions: 186,
    summary: '5% off weekly/monthly for high-tenure segment on Weekly and Monthly plans.',
  },
  {
    id: 'DSC-03',
    name: 'Ramadan renewals',
    code: 'RAMADAN-26',
    valueType: 'PERCENT',
    value: 20,
    startDate: 'Mar 1, 2026',
    endDate: 'Mar 30, 2026',
    status: 'PENDING',
    appliesToAllPlans: true,
    planIds: [],
    periods: ['weekly', 'monthly'],
    audience: 'ALL',
    channels: 'App · USSD · Hub',
    redemptions: 0,
    approvalId: 'APR-06',
    summary: 'Seasonal 20% off timed-plan renewals. Pending dual control.',
  },
  {
    id: 'DSC-04',
    name: 'New rider welcome',
    code: 'WELCOME-500',
    valueType: 'AMOUNT',
    value: 500,
    startDate: 'Oct 1, 2026',
    endDate: 'Oct 31, 2026',
    status: 'SCHEDULED',
    appliesToAllPlans: false,
    planIds: ['PLN-01'],
    periods: ['daily'],
    audience: 'ALL',
    channels: 'App',
    redemptions: 0,
    summary: '₦500 off first Daily Pass purchase in October.',
  },
  {
    id: 'DSC-05',
    name: 'Ikeja hub launch',
    code: 'IKEJA-10',
    valueType: 'PERCENT',
    value: 10,
    startDate: 'Jun 1, 2026',
    endDate: 'Jun 30, 2026',
    status: 'EXPIRED',
    appliesToAllPlans: true,
    planIds: [],
    periods: ['daily', 'weekly', 'monthly', 'swap'],
    audience: 'ALL',
    channels: 'Hub',
    redemptions: 940,
    summary: 'Launch promo — expired. Kept for audit.',
  },
  {
    id: 'DSC-06',
    name: 'Coop draft (paused)',
    code: 'COOP-DRAFT',
    valueType: 'PERCENT',
    value: 12,
    startDate: '—',
    endDate: '—',
    status: 'PAUSED',
    appliesToAllPlans: false,
    planIds: ['PLN-04'],
    periods: ['weekly'],
    audience: 'SEGMENT',
    segmentName: 'Igbokoda fishermen',
    channels: 'App · Hub',
    redemptions: 12,
    summary: 'Paused while cooperative billing terms are confirmed.',
  },
  {
    id: 'DSC-07',
    name: 'Swap saver',
    code: 'SWAP-10',
    valueType: 'PERCENT',
    value: 10,
    startDate: 'Sep 1, 2026',
    endDate: 'Dec 31, 2026',
    status: 'ACTIVE',
    appliesToAllPlans: true,
    planIds: [],
    periods: ['swap'],
    audience: 'ALL',
    channels: 'App · Hub',
    redemptions: 64,
    summary: '10% off pay-per-swap. Rider or hub agent must enter the code — never auto-applied.',
  },
]

/** Operators currently (or recently) redeeming a discount. */
export interface DiscountUserRecord {
  id: string
  discountId: string
  operatorName: string
  operatorId: string
  kuraId: string
  planLabel: string
  channel: 'App' | 'USSD' | 'Hub'
  vehicles: number
  timesUsed: number
  savedNaira: number
  lastApplied: string
  status: 'ACTIVE' | 'LAPSED'
}

export const MOCK_DISCOUNT_USERS: DiscountUserRecord[] = [
  {
    id: 'DU-01',
    discountId: 'DSC-01',
    operatorName: 'Blessing Okafor',
    operatorId: 'OP-02',
    kuraId: 'KR-482137',
    planLabel: 'Weekly',
    channel: 'App',
    vehicles: 6,
    timesUsed: 14,
    savedNaira: 7280,
    lastApplied: 'Today · 09:12',
    status: 'ACTIVE',
  },
  {
    id: 'DU-02',
    discountId: 'DSC-01',
    operatorName: 'Chinedu Eze',
    operatorId: 'OP-04',
    kuraId: 'KR-482210',
    planLabel: 'Monthly',
    channel: 'Hub',
    vehicles: 8,
    timesUsed: 9,
    savedNaira: 17280,
    lastApplied: 'Yesterday · 16:40',
    status: 'ACTIVE',
  },
  {
    id: 'DU-03',
    discountId: 'DSC-01',
    operatorName: 'Amina Yusuf',
    operatorId: 'OP-05',
    kuraId: 'KR-482255',
    planLabel: 'Weekly',
    channel: 'USSD',
    vehicles: 5,
    timesUsed: 11,
    savedNaira: 5720,
    lastApplied: 'Sep 4 · 11:05',
    status: 'ACTIVE',
  },
  {
    id: 'DU-04',
    discountId: 'DSC-01',
    operatorName: 'Ikeja Fleet Coop',
    operatorId: 'OP-08',
    kuraId: 'KR-482401',
    planLabel: 'Monthly',
    channel: 'App',
    vehicles: 12,
    timesUsed: 22,
    savedNaira: 42240,
    lastApplied: 'Today · 07:55',
    status: 'ACTIVE',
  },
  {
    id: 'DU-05',
    discountId: 'DSC-01',
    operatorName: 'Tunde Bakare',
    operatorId: 'OP-01',
    kuraId: 'KR-482100',
    planLabel: 'Monthly',
    channel: 'App',
    vehicles: 5,
    timesUsed: 3,
    savedNaira: 5760,
    lastApplied: 'Aug 28 · 10:20',
    status: 'LAPSED',
  },
  {
    id: 'DU-01b',
    discountId: 'DSC-01',
    operatorName: 'Sola Adeyemi',
    operatorId: 'OP-10',
    kuraId: 'KR-482610',
    planLabel: 'Weekly',
    channel: 'Hub',
    vehicles: 7,
    timesUsed: 5,
    savedNaira: 2600,
    lastApplied: 'Sep 2 · 12:10',
    status: 'ACTIVE',
  },
  {
    id: 'DU-01c',
    discountId: 'DSC-01',
    operatorName: 'Ngozi Okeke',
    operatorId: 'OP-11',
    kuraId: 'KR-482611',
    planLabel: 'Monthly',
    channel: 'App',
    vehicles: 9,
    timesUsed: 7,
    savedNaira: 13440,
    lastApplied: 'Sep 1 · 09:00',
    status: 'ACTIVE',
  },
  {
    id: 'DU-01d',
    discountId: 'DSC-01',
    operatorName: 'Ibrahim Musa',
    operatorId: 'OP-12',
    kuraId: 'KR-482612',
    planLabel: 'Weekly',
    channel: 'USSD',
    vehicles: 5,
    timesUsed: 4,
    savedNaira: 2080,
    lastApplied: 'Aug 30 · 15:22',
    status: 'ACTIVE',
  },
  {
    id: 'DU-01e',
    discountId: 'DSC-01',
    operatorName: 'Funke Ajayi',
    operatorId: 'OP-13',
    kuraId: 'KR-482613',
    planLabel: 'Monthly',
    channel: 'App',
    vehicles: 6,
    timesUsed: 10,
    savedNaira: 19200,
    lastApplied: 'Today · 11:40',
    status: 'ACTIVE',
  },
  {
    id: 'DU-01f',
    discountId: 'DSC-01',
    operatorName: 'Emeka Obi',
    operatorId: 'OP-14',
    kuraId: 'KR-482614',
    planLabel: 'Weekly',
    channel: 'Hub',
    vehicles: 11,
    timesUsed: 16,
    savedNaira: 8320,
    lastApplied: 'Yesterday · 08:05',
    status: 'ACTIVE',
  },
  {
    id: 'DU-01g',
    discountId: 'DSC-01',
    operatorName: 'Hadiza Bello',
    operatorId: 'OP-15',
    kuraId: 'KR-482615',
    planLabel: 'Monthly',
    channel: 'App',
    vehicles: 5,
    timesUsed: 2,
    savedNaira: 3840,
    lastApplied: 'Aug 22 · 17:30',
    status: 'LAPSED',
  },
  {
    id: 'DU-01h',
    discountId: 'DSC-01',
    operatorName: 'Kemi Lawal',
    operatorId: 'OP-16',
    kuraId: 'KR-482616',
    planLabel: 'Weekly',
    channel: 'USSD',
    vehicles: 8,
    timesUsed: 9,
    savedNaira: 4680,
    lastApplied: 'Sep 3 · 13:18',
    status: 'ACTIVE',
  },
  {
    id: 'DU-06',
    discountId: 'DSC-02',
    operatorName: 'Yusuf Abdullahi',
    operatorId: 'OP-01',
    kuraId: 'KR-482100',
    planLabel: 'Monthly',
    channel: 'App',
    vehicles: 1,
    timesUsed: 8,
    savedNaira: 9600,
    lastApplied: 'Today · 08:30',
    status: 'ACTIVE',
  },
  {
    id: 'DU-07',
    discountId: 'DSC-02',
    operatorName: 'Fatima Bello',
    operatorId: 'OP-06',
    kuraId: 'KR-482188',
    planLabel: 'Weekly',
    channel: 'USSD',
    vehicles: 1,
    timesUsed: 6,
    savedNaira: 1950,
    lastApplied: 'Sep 3 · 14:12',
    status: 'ACTIVE',
  },
  {
    id: 'DU-08',
    discountId: 'DSC-05',
    operatorName: 'Hub walk-in batch',
    operatorId: 'OP-09',
    kuraId: 'KR-482500',
    planLabel: 'Daily',
    channel: 'Hub',
    vehicles: 1,
    timesUsed: 40,
    savedNaira: 4800,
    lastApplied: 'Jun 29 · 18:00',
    status: 'LAPSED',
  },
]

export const MOCK_COHORTS: CohortRecord[] = [
  {
    id: 'COH-01',
    name: 'Jan 2026',
    size: 84,
    m1: '94%',
    m3: '88%',
    m6: '83%',
    arpu: 36000,
    status: 'MATURE',
  },
  {
    id: 'COH-02',
    name: 'Feb 2026',
    size: 106,
    m1: '93%',
    m3: '87%',
    m6: '82%',
    arpu: 36400,
    status: 'MATURE',
  },
  {
    id: 'COH-03',
    name: 'Mar 2026',
    size: 128,
    m1: '92%',
    m3: '86%',
    m6: '81%',
    arpu: 36800,
    status: 'MATURE',
  },
  {
    id: 'COH-04',
    name: 'Apr 2026',
    size: 150,
    m1: '91%',
    m3: '85%',
    m6: '80%',
    arpu: 37200,
    status: 'MATURE',
  },
  {
    id: 'COH-05',
    name: 'May 2026',
    size: 172,
    m1: '90%',
    m3: '84%',
    m6: '79%',
    arpu: 37600,
    status: 'MATURE',
  },
  {
    id: 'COH-06',
    name: 'Jun 2026',
    size: 194,
    m1: '89%',
    m3: '83%',
    m6: '78%',
    arpu: 38000,
    status: 'MATURE',
  },
  {
    id: 'COH-07',
    name: 'Jul 2026',
    size: 216,
    m1: '88%',
    m3: '82%',
    m6: '—',
    arpu: 38400,
    status: 'ACTIVE',
  },
  {
    id: 'COH-08',
    name: 'Aug 2026',
    size: 238,
    m1: '87%',
    m3: '81%',
    m6: '—',
    arpu: 38800,
    status: 'ACTIVE',
  },
]

export const MOCK_REVENUE_BY_VEHICLE: RevenueVehicleRow[] = [
  {
    id: 'rv1',
    vehicleType: 'Motorcycle',
    operators: 842,
    mrr: 28400000,
    arpu: 33700,
    churn: '2.8%',
    cogsNaira: 16200000,
    swapsPerOperator30d: 18,
  },
  {
    id: 'rv2',
    vehicleType: 'Tricycle',
    operators: 268,
    mrr: 12400000,
    arpu: 46270,
    churn: '3.4%',
    cogsNaira: 7100000,
    swapsPerOperator30d: 22,
  },
  {
    id: 'rv3',
    vehicleType: 'Boat',
    operators: 174,
    mrr: 7400000,
    arpu: 42530,
    churn: '4.1%',
    cogsNaira: 4800000,
    swapsPerOperator30d: 14,
  },
  {
    id: 'rv4',
    vehicleType: 'Fleet (mixed)',
    operators: 0,
    mrr: 0,
    arpu: 0,
    churn: '—',
    cogsNaira: 0,
    swapsPerOperator30d: 0,
  },
]

/** Legacy table shape kept for any residual imports. Prefer MOCK_REVENUE_STREAMS. */
export const MOCK_REVENUE_OVERVIEW = [
  { id: 'ro1', metric: 'Plan subscriptions', value: '₦31.4M', share: '65%' },
  { id: 'ro2', metric: 'Pay-per-swap', value: '₦8.2M', share: '17%' },
  { id: 'ro3', metric: 'Working capital interest', value: '₦5.1M', share: '11%' },
  { id: 'ro4', metric: 'Partner / insurance', value: '₦3.5M', share: '7%' },
]

/** Period totals (selected range baseline ≈ current month). */
export const MOCK_REVENUE_STREAMS: RevenueStreamRow[] = [
  {
    id: 'rs1',
    layer: 'Energy',
    metric: 'Plan subscriptions',
    amountNaira: 31_400_000,
    shareable: true,
  },
  {
    id: 'rs2',
    layer: 'Energy',
    metric: 'Pay-per-swap',
    amountNaira: 8_200_000,
    shareable: true,
  },
  {
    id: 'rs3',
    layer: 'Finance',
    metric: 'Working capital interest',
    amountNaira: 5_100_000,
    shareable: true,
  },
  {
    id: 'rs4',
    layer: 'Finance',
    metric: 'Insurance / financing commissions',
    amountNaira: 2_100_000,
    shareable: false,
  },
  {
    id: 'rs5',
    layer: 'Data',
    metric: 'Licensed activity exports',
    amountNaira: 1_400_000,
    shareable: false,
  },
]

export const MOCK_REVENUE_CHANNELS: RevenueChannelRow[] = [
  { id: 'ch1', channel: 'Virtual account', amountNaira: 22_800_000, txCount: 1842 },
  { id: 'ch2', channel: 'Wallet debit', amountNaira: 11_600_000, txCount: 920 },
  { id: 'ch3', channel: 'Cash at hub', amountNaira: 8_400_000, txCount: 610 },
  { id: 'ch4', channel: 'USSD', amountNaira: 3_200_000, txCount: 408 },
  { id: 'ch5', channel: 'Card', amountNaira: 2_200_000, txCount: 156 },
]

/** Stacked monthly platform revenue (₦M). Data layer shown but not shareable. */
export const MOCK_REVENUE_MONTHLY: RevenueMonthPoint[] = [
  { label: 'Jan', energy: 9.2, finance: 1.8, licensing: 0.4 },
  { label: 'Feb', energy: 11.4, finance: 2.1, licensing: 0.5 },
  { label: 'Mar', energy: 14.1, finance: 2.6, licensing: 0.6 },
  { label: 'Apr', energy: 17.8, finance: 3.2, licensing: 0.7 },
  { label: 'May', energy: 21.6, finance: 3.9, licensing: 0.9 },
  { label: 'Jun', energy: 25.4, finance: 4.6, licensing: 1.0 },
  { label: 'Jul', energy: 29.8, finance: 5.4, licensing: 1.1 },
  { label: 'Aug', energy: 34.6, finance: 6.2, licensing: 1.2 },
  { label: 'Sep', energy: 39.6, finance: 7.2, licensing: 1.4 },
]

export const MOCK_REVENUE_COLLECTIONS: RevenueCollectionsSnapshot = {
  outstandingNaira: 4_860_000,
  renewalRatePct: 88.2,
  churn30dPct: 3.1,
  agentCashUnreconciledNaira: 420_000,
  activeOperators: 1284,
  mrrNaira: 48_200_000,
}

export const DEFAULT_REVENUE_ANALYTICS_SETTINGS: RevenueAnalyticsSettings = {
  latilaSharePct: 60,
  emicraftSharePct: 40,
  vatPct: 7.5,
  arpuBasis: 'mrr',
  ltvHorizonMonths: 12,
  ltvRetentionFactorPct: 82,
  churnWarnPct: 5,
  renewalTargetPct: 85,
}

/** Monthly ARPU inputs (aligns Sep with collections MRR / operators). */
export const MOCK_REVENUE_ARPU_MONTHLY: RevenueArpuMonth[] = [
  { label: 'Jan', mrrNaira: 28_400_000, energyNaira: 33_200_000, activeOperators: 980 },
  { label: 'Feb', mrrNaira: 30_100_000, energyNaira: 35_400_000, activeOperators: 1012 },
  { label: 'Mar', mrrNaira: 32_800_000, energyNaira: 38_100_000, activeOperators: 1054 },
  { label: 'Apr', mrrNaira: 35_600_000, energyNaira: 41_200_000, activeOperators: 1098 },
  { label: 'May', mrrNaira: 38_900_000, energyNaira: 44_800_000, activeOperators: 1142 },
  { label: 'Jun', mrrNaira: 41_200_000, energyNaira: 47_600_000, activeOperators: 1180 },
  { label: 'Jul', mrrNaira: 43_800_000, energyNaira: 50_400_000, activeOperators: 1218 },
  { label: 'Aug', mrrNaira: 46_100_000, energyNaira: 53_200_000, activeOperators: 1250 },
  { label: 'Sep', mrrNaira: 48_200_000, energyNaira: 55_800_000, activeOperators: 1284 },
]

export const MOCK_IMPACT_STORIES: ImpactStoryRecord[] = [
  {
    id: 'IMP-01',
    title: 'Yaba corridor cuts petrol spend 62%',
    region: 'Lagos Mainland',
    metricHighlight: '₦48M fuel saved',
    partners: 'LAMATA · LASTMA',
    publishedAt: 'Sep 1, 2026',
    status: 'PUBLISHED',
    summary:
      'Motorcycle operators along the Yaba–Oshodi corridor switched to swap plans and reported lower weekly fuel outlay within 90 days.',
  },
  {
    id: 'IMP-02',
    title: 'Igbokoda e-boarders replace 40 outboards',
    region: 'Ondo Coast',
    metricHighlight: '40 engines retired',
    partners: 'Ondo State · Co-op Union',
    publishedAt: 'Aug 18, 2026',
    status: 'PUBLISHED',
    summary:
      'Marine retrofit pilots at Igbokoda Waterfront Hub locked ICE outboards into storage and issued Asobo e-drive kits.',
  },
  {
    id: 'IMP-03',
    title: 'Oshodi hub SOH recovery program',
    region: 'Lagos Central',
    metricHighlight: '1.2t CO₂ avoided',
    partners: 'Lagos MoE',
    publishedAt: 'Aug 4, 2026',
    status: 'DRAFT',
    summary:
      'Draft brief on pack recycling and capacity recovery for packs below 60% SOH routed through Oshodi Terminal.',
  },
  {
    id: 'IMP-04',
    title: 'Ajah last-mile swap density',
    region: 'Lagos East',
    metricHighlight: '18k swaps YTD',
    partners: 'LAMATA',
    publishedAt: 'Jul 22, 2026',
    status: 'PUBLISHED',
    summary:
      'Ajah Junction Station crossed 18,000 completed swaps year-to-date with average wait under four minutes.',
  },
  {
    id: 'IMP-05',
    title: 'Ikeja cooperative float impact',
    region: 'Lagos Mainland',
    metricHighlight: '2,140 operators',
    partners: 'NURTW Ikeja',
    publishedAt: 'Jun 30, 2026',
    status: 'ARCHIVED',
    summary:
      'Quarterly archive of cooperative float coverage for tricycle operators attached to Ikeja Along Station.',
  },
]

export const MOCK_ENGINES: EngineRecord[] = [
  {
    id: 'ENG-01',
    code: 'ICE-SPI-88421',
    vehicleReg: 'LSR-482-XA',
    vehicleType: 'Motorcycle',
    ownerName: 'Yusuf Abdullahi',
    hub: 'Yaba Motor Park Mega Hub',
    category: 'STORED',
    status: 'STORED',
    storedSince: 'Mar 14, 2026',
    safetyChecks: {
      hull: true,
      mount: true,
      throttle: true,
      kill: true,
      cable: true,
      float: true,
    },
    activatedAt: 'Mar 14, 2026',
  },
  {
    id: 'ENG-02',
    code: 'ICE-KEK-22019',
    vehicleReg: 'AKD-771-KJ',
    vehicleType: 'Tricycle',
    ownerName: 'Blessing Okafor',
    hub: 'Ikeja Along Station',
    category: 'STORED',
    status: 'RETURN_REQUESTED',
    storedSince: 'Apr 02, 2026',
    safetyChecks: {
      hull: true,
      mount: true,
      throttle: true,
      kill: true,
      cable: true,
      float: true,
    },
    activatedAt: 'Apr 02, 2026',
  },
  {
    id: 'ENG-03',
    code: 'ENG-IGB-103',
    petrolLabel: 'Yamaha 15HP',
    petrolMake: 'Yamaha',
    petrolModel: '15HP',
    petrolHp: '15',
    conditionGrade: 'Good',
    vehicleReg: 'HULL-IGB-14',
    vehicleType: 'Boat',
    ownerName: 'Yusuf Abdullahi',
    hub: 'Igbokoda Marine Waterfront Hub',
    category: 'E_BOARDER',
    status: 'STORED',
    storedSince: 'Apr 2, 2026',
    custodyPhotos: defaultEngineCustodyPhotos({
      code: 'ENG-IGB-103',
      vehicleReg: 'HULL-IGB-14',
      petrolLabel: 'Yamaha 15HP',
    }),
    safetyChecks: {
      hull: true,
      mount: true,
      throttle: true,
      kill: true,
      cable: true,
      float: true,
    },
    activatedAt: 'Apr 2, 2026',
  },
  {
    id: 'ENG-04',
    code: 'ICE-SPI-77102',
    vehicleReg: 'KJA-209-BC',
    vehicleType: 'Motorcycle',
    ownerName: 'Chinedu Eze',
    hub: 'Oshodi Transport Terminal Hub',
    category: 'STORED',
    status: 'SAFETY_FAILED',
    storedSince: 'May 10, 2026',
    safetyChecks: {
      hull: true,
      mount: true,
      throttle: false,
      kill: true,
      cable: false,
      float: true,
    },
  },
  {
    id: 'ENG-05',
    code: 'ICE-KEK-33088',
    vehicleReg: 'EPE-551-QW',
    vehicleType: 'Tricycle',
    ownerName: 'Fatima Bello',
    hub: 'Ajah Junction Station',
    category: 'RETROFIT',
    status: 'IN_QUEUE',
    storedSince: 'Jun 22, 2026',
  },
  {
    id: 'ENG-06',
    code: 'ICE-ASO-22011',
    petrolLabel: 'Yamaha 15HP',
    petrolMake: 'Yamaha',
    petrolModel: '15HP',
    petrolHp: '15',
    conditionGrade: 'Fair',
    vehicleReg: 'HULL-IGB-22',
    vehicleType: 'Boat',
    ownerName: 'Ibrahim Musa',
    hub: 'Igbokoda Marine Waterfront Hub',
    category: 'E_BOARDER',
    status: 'IN_QUEUE',
    storedSince: 'Jul 08, 2026',
    custodyPhotos: defaultEngineCustodyPhotos({
      code: 'ICE-ASO-22011',
      vehicleReg: 'HULL-IGB-22',
      petrolLabel: 'Yamaha 15HP',
    }),
  },
  {
    id: 'ENG-07',
    code: 'ICE-SPI-90211',
    vehicleReg: 'APP-118-ZT',
    vehicleType: 'Motorcycle',
    ownerName: 'Ibrahim Musa',
    hub: 'Mile 12 Market Depot',
    category: 'RETROFIT',
    status: 'IN_QUEUE',
    storedSince: 'Aug 01, 2026',
  },
  {
    id: 'ENG-08',
    code: 'ICE-SPI-66100',
    vehicleReg: 'LSR-901-QQ',
    vehicleType: 'Motorcycle',
    ownerName: 'Amaka Nwosu',
    hub: 'Yaba Motor Park Mega Hub',
    category: 'STORED',
    status: 'RELEASED',
    storedSince: 'Jan 12, 2026',
    safetyChecks: {
      hull: true,
      mount: true,
      throttle: true,
      kill: true,
      cable: true,
      float: true,
    },
    activatedAt: 'Jan 12, 2026',
  },
]
