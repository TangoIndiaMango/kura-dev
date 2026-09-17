/** Resume bay UI from an in-progress swap session. */
import type { BatteryRecord } from '@shared/mock/adminMockData'
import type { SwapSessionApi } from './hooks/use-bay-swap'

export type BaySessionStep =
  | 'lookup'
  | 'triage'
  | 'return'
  | 'issue'
  | 'settle'
  | 'done'

export function resumeStepFromSwap(
  session: Pick<SwapSessionApi, 'status'>,
  skipReturn: boolean,
): BaySessionStep {
  const status = (session.status || '').toUpperCase()
  if (status === 'COMPLETED') return 'done'
  if (status === 'ISSUED') return 'settle'
  if (status === 'RETURN_RECORDED') return 'issue'
  if (status === 'STARTED') return skipReturn ? 'issue' : 'return'
  return 'triage'
}

export function packStubFromSerial(
  serial: string | null | undefined,
  catalogue: BatteryRecord[],
  chargePct = 100,
): BatteryRecord | null {
  const s = (serial || '').trim()
  if (!s) return null
  const found = catalogue.find((b) => b.serial === s)
  if (found) return found
  return {
    id: `resume-${s}`,
    serial: s,
    type: 'Pack',
    location: 'Session',
    chargePct,
    healthPct: 100,
    cycles: 0,
    voltage: '—',
    status: 'IN_FIELD',
    lastFullCharge: '—',
  }
}
