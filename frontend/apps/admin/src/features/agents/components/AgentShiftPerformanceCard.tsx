import { useMemo } from 'react'
import {
  Coins01Icon,
  Timer01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  FlashIcon,
} from 'hugeicons-react'
import type { AgentRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import type { AgentExtras } from '../agentDetailHelpers'

interface AgentShiftPerformanceCardProps {
  agent: AgentRecord
  extras: AgentExtras
}

export function AgentShiftPerformanceCard({
  agent,
  extras,
}: AgentShiftPerformanceCardProps) {
  // Opening float, collections, drawer total
  const openingFloat = extras.cashFloat || 10_000
  const cashCollected = extras.cashCollectedToday
  const expectedDrawer = openingFloat + cashCollected
  const deposited = extras.cashDepositedToday
  const variance = extras.cashVariance

  // Override limit per PRD Section 5.6: 3 daily threshold
  const overrideCount = agent.overridesToday
  const overrideMax = 3
  const overridePct = Math.min(100, Math.round((overrideCount / overrideMax) * 100))

  // Turnaround metrics benchmark
  const avgTurnaroundSec = useMemo(() => {
    // Generate deterministic speed between 44s and 68s based on agent id
    const seed = agent.id.charCodeAt(agent.id.length - 1)
    return 44 + (seed % 24)
  }, [agent.id])

  const meetsBenchmark = avgTurnaroundSec <= 60

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Cash Drawer & Float Balancing */}
        <section className="flex flex-col justify-between rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--bd)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tb)] text-[var(--pr)]">
                  <Coins01Icon size={18} />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-bold text-[var(--tx)]">Cash Drawer Balance</h3>
                  <p className="text-[11px] text-[var(--mu)]">Shift Float & Cash Reconciliation</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  variance === 0
                    ? 'border border-[#1E8E4E]/30 bg-[var(--tg)] text-[#1E8E4E]'
                    : variance < 0
                      ? 'border border-[#C0392B]/30 bg-[var(--tr)] text-[#C0392B]'
                      : 'border border-[#C47D0E]/30 bg-[var(--ta)] text-[#C47D0E]'
                }`}
              >
                {variance === 0 ? (
                  <>
                    <CheckmarkCircle02Icon size={12} /> BALANCED
                  </>
                ) : (
                  <>
                    <Alert02Icon size={12} /> {variance < 0 ? 'SHORT' : 'OVER'} {formatNaira(Math.abs(variance))}
                  </>
                )}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-[12.5px]">
              <div className="flex items-center justify-between text-[var(--mu)]">
                <span>Opening Cash Float</span>
                <span className="font-semibold tabular-nums text-[var(--tx)]">
                  {formatNaira(openingFloat)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--mu)]">
                <span>Shift Swap Collections</span>
                <span className="font-semibold tabular-nums text-[var(--tx)]">
                  +{formatNaira(cashCollected)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-[var(--bd)] pt-2 font-medium text-[var(--tx)]">
                <span>Expected Drawer Total</span>
                <span className="font-bold tabular-nums text-[var(--pr)]">
                  {formatNaira(expectedDrawer)}
                </span>
              </div>
              {deposited > 0 ? (
                <div className="flex items-center justify-between text-[var(--mu)]">
                  <span>Banked / Deposited</span>
                  <span className="font-semibold tabular-nums text-[#1E8E4E]">
                    -{formatNaira(deposited)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-[10px] bg-[var(--in)] px-3 py-2 text-[11.5px] text-[var(--mu)]">
            Shift status: <strong className="text-[var(--tx)]">{extras.shiftOpen ? 'Active Shift' : 'Closed'}</strong> · Handover PIN logged
          </div>
        </section>

        {/* 2. Override Quota Risk Meter */}
        <section className="flex flex-col justify-between rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--bd)] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    overrideCount >= 3
                      ? 'bg-[var(--tr)] text-[#C0392B]'
                      : overrideCount >= 1
                        ? 'bg-[var(--ta)] text-[#C47D0E]'
                        : 'bg-[var(--tg)] text-[#1E8E4E]'
                  }`}
                >
                  <Alert02Icon size={18} />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-bold text-[var(--tx)]">Shift Override Quota</h3>
                  <p className="text-[11px] text-[var(--mu)]">Supervisor threshold</p>
                </div>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  overrideCount >= 3
                    ? 'bg-[var(--tr)] text-[#C0392B]'
                    : overrideCount >= 1
                      ? 'bg-[var(--ta)] text-[#C47D0E]'
                      : 'bg-[var(--tg)] text-[#1E8E4E]'
                }`}
              >
                {overrideCount} / {overrideMax} max
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold text-[var(--tx)]">
                  {overrideCount === 0
                    ? 'Zero Overrides (Strict Verification)'
                    : overrideCount < 3
                      ? 'Elevated Override Frequency'
                      : 'Alert Threshold Triggered'}
                </span>
                <span className="text-[11px] text-[var(--mu)]">{overridePct}% utilized</span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--in)]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    overrideCount >= 3
                      ? 'bg-[#C0392B]'
                      : overrideCount >= 1
                        ? 'bg-[#C47D0E]'
                        : 'bg-[#1E8E4E]'
                  }`}
                  style={{ width: `${Math.max(5, overridePct)}%` }}
                />
              </div>

              <div className="mt-3.5 space-y-1 text-[12px]">
                <div className="flex items-center justify-between text-[var(--mu)]">
                  <span>Last Override Reason:</span>
                  <span className="font-medium text-[var(--tx)]">
                    {overrideCount > 0 ? 'NFC Offline Fallback' : 'None logged'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--mu)]">
                  <span>Supervisor Notification:</span>
                  <span className={overrideCount >= 3 ? 'font-bold text-[#C0392B]' : 'text-[var(--tx)]'}>
                    {overrideCount >= 3 ? 'Triggered SMS & Push' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[10px] bg-[var(--in)] px-3 py-2 text-[11.5px] text-[var(--mu)]">
            Quota automatically resets at 00:00 WAT daily.
          </div>
        </section>

        {/* 3. Swap Turnaround Speed & Benchmark */}
        <section className="flex flex-col justify-between rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--bd)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tb)] text-[var(--pr)]">
                  <Timer01Icon size={18} />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-bold text-[var(--tx)]">Turnaround Speed</h3>
                  <p className="text-[11px] text-[var(--mu)]">Target: &lt;60s per swap</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  meetsBenchmark
                    ? 'border border-[#1E8E4E]/30 bg-[var(--tg)] text-[#1E8E4E]'
                    : 'border border-[#C47D0E]/30 bg-[var(--ta)] text-[#C47D0E]'
                }`}
              >
                <FlashIcon size={12} /> {meetsBenchmark ? 'FAST' : 'SUB-OPTIMAL'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[32px] font-black tabular-nums tracking-tight text-[var(--tx)]">
                {avgTurnaroundSec}s
              </span>
              <span className="text-[12.5px] font-medium text-[var(--mu)]">
                avg cycle duration
              </span>
            </div>

            <div className="mt-3 space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between text-[var(--mu)]">
                <span>Benchmark compliance</span>
                <span className="font-semibold tabular-nums text-[#1E8E4E]">
                  {meetsBenchmark ? '96.2%' : '81.4%'} &lt; 60s
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--mu)]">
                <span>Peak dispatch speed</span>
                <span className="font-semibold tabular-nums text-[var(--tx)]">
                  {Math.max(34, avgTurnaroundSec - 12)}s best
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--mu)]">
                <span>Hourly peak flow</span>
                <span className="font-semibold tabular-nums text-[var(--tx)]">
                  14 swaps/hr
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[10px] bg-[var(--in)] px-3 py-2 text-[11.5px] text-[var(--mu)]">
            Measured from QR scan verification to bay lock latch.
          </div>
        </section>
      </div>
    </div>
  )
}
