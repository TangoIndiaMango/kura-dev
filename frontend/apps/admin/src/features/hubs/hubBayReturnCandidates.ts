import type { BatteryRecord } from '@shared/mock/adminMockData'

export function buildReturnCandidates(args: {
  expectedSerial: string | null | undefined
  fetched: BatteryRecord[]
  vehicleReg: string
  batteryTypeHint?: string
  chargePct?: number
}): BatteryRecord[] {
  const expect = (args.expectedSerial || '').trim()
  if (!expect) return []

  const upper = expect.toUpperCase()
  const hit = args.fetched.find((b) => b.serial.toUpperCase() === upper)
  if (hit) return [hit]

  return [
    {
      id: `expected:${expect}`,
      serial: expect,
      type: args.batteryTypeHint || 'Mounted pack',
      location: args.vehicleReg,
      chargePct: args.chargePct ?? 0,
      healthPct: 100,
      cycles: 0,
      voltage: '—',
      status: 'IN_FIELD',
      lastFullCharge: '—',
    },
  ]
}
