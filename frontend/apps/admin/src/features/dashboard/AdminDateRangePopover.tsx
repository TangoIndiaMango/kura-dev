import React, { useState } from 'react'

export interface AdminDateRangePopoverProps {
  isOpen: boolean
  onClose: () => void
  currentPreset?: string
  startDate?: string
  endDate?: string
  onApply?: (preset: string, range: [string, string]) => void
}

const PRESETS = [
  'Today',
  'Yesterday',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Year',
  'Last Year',
  'All time',
]

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export const AdminDateRangePopover: React.FC<AdminDateRangePopoverProps> = ({
  isOpen,
  onClose,
  currentPreset = 'This Month',
  startDate = 'Sep 1, 2026',
  endDate = 'Sep 30, 2026',
  onApply,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(currentPreset)
  const [rangeStart, setRangeStart] = useState(startDate)
  const [rangeEnd, setRangeEnd] = useState(endDate)

  if (!isOpen) return null

  const handleSelectPreset = (p: string) => {
    setSelectedPreset(p)
    switch (p) {
      case 'Today':
        setRangeStart('Sep 4, 2026')
        setRangeEnd('Sep 4, 2026')
        break
      case 'Yesterday':
        setRangeStart('Sep 3, 2026')
        setRangeEnd('Sep 3, 2026')
        break
      case 'This Week':
        setRangeStart('Aug 31, 2026')
        setRangeEnd('Sep 6, 2026')
        break
      case 'Last Week':
        setRangeStart('Aug 24, 2026')
        setRangeEnd('Aug 30, 2026')
        break
      case 'This Month':
        setRangeStart('Sep 1, 2026')
        setRangeEnd('Sep 30, 2026')
        break
      case 'Last Month':
        setRangeStart('Aug 1, 2026')
        setRangeEnd('Aug 31, 2026')
        break
      case 'This Year':
        setRangeStart('Jan 1, 2026')
        setRangeEnd('Dec 31, 2026')
        break
      case 'Last Year':
        setRangeStart('Jan 1, 2025')
        setRangeEnd('Dec 31, 2025')
        break
      case 'All time':
        setRangeStart('Mar 1, 2026')
        setRangeEnd('Sep 4, 2026')
        break
    }
  }

  const handleReset = () => {
    setSelectedPreset('This Month')
    setRangeStart('Sep 1, 2026')
    setRangeEnd('Sep 30, 2026')
  }

  const handleApply = () => {
    if (onApply) {
      onApply(selectedPreset, [rangeStart, rangeEnd])
    }
    onClose()
  }

  // September 2026 starts on Tuesday (index 1), 30 days
  const sepDays = Array.from({ length: 30 }, (_, i) => i + 1)
  // October 2026 starts on Thursday (index 3), 31 days
  const octDays = Array.from({ length: 31 }, (_, i) => i + 1)

  const isThisMonth = selectedPreset === 'This Month'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-transparent"
        onClick={onClose}
      />

      {/* Floating Popover matching Screenshot 5 */}
      <div
        className="absolute top-[66px] right-2 sm:right-5 z-40 w-[95vw] sm:w-[880px] bg-[var(--sf)] border border-[var(--bd)] rounded-[14px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)] p-4 sm:p-[22px] flex flex-col sm:flex-row gap-4 sm:gap-6 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Left column: Presets */}
        <div className="w-full sm:w-[120px] flex sm:flex-col flex-wrap gap-[2px] flex-shrink-0">
          {PRESETS.map((preset) => {
            const isActive = selectedPreset === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                style={{
                  background: isActive ? 'var(--prs)' : 'transparent',
                  color: isActive ? 'var(--pr)' : 'var(--tx)',
                  fontWeight: isActive ? 700 : 400,
                }}
                className="text-left px-2.5 py-2 border-0 rounded-[6px] text-[13.5px] cursor-pointer font-sans transition-colors hover:bg-[var(--hv)] whitespace-nowrap"
              >
                {preset}
              </button>
            )
          })}
        </div>

        {/* Right column: Dual calendar & actions */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col md:flex-row gap-6 md:gap-7">
            {/* September 2026 */}
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-2.5 py-1.5 rounded-[8px] bg-[var(--in)]">
                <span className="text-[var(--mu)] text-sm cursor-pointer select-none">‹</span>
                <span className="text-[15px] font-bold text-[var(--tx)]">September 2026</span>
                <span className="text-[var(--mu)] text-sm cursor-pointer select-none">›</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DOW.map((d) => (
                  <div key={d} className="text-[11.5px] text-[var(--su)] py-1 font-medium">
                    {d}
                  </div>
                ))}
                {/* Empty slot for Monday (1-day offset) */}
                <div />
                {sepDays.map((d) => {
                  const isEdge = isThisMonth && (d === 1 || d === 30)
                  const isInRange = isThisMonth && d > 1 && d < 30
                  return (
                    <button
                      key={`sep-${d}`}
                      type="button"
                      onClick={() => {
                        setRangeStart(`Sep ${d}, 2026`)
                        setRangeEnd(`Sep ${d}, 2026`)
                      }}
                      style={{
                        background: isEdge
                          ? 'var(--pr)'
                          : isInRange
                            ? 'var(--prs)'
                            : 'var(--in)',
                        color: isEdge ? '#fff' : 'var(--tx)',
                        fontWeight: isEdge ? 700 : 400,
                      }}
                      className="h-[34px] rounded-[6px] border-0 text-[13px] cursor-pointer font-sans transition-colors hover:opacity-90"
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* October 2026 */}
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-2.5 py-1.5 rounded-[8px] bg-[var(--in)]">
                <span className="text-[var(--mu)] text-sm cursor-pointer select-none">‹</span>
                <span className="text-[15px] font-bold text-[var(--tx)]">October 2026</span>
                <span className="text-[var(--mu)] text-sm cursor-pointer select-none">›</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DOW.map((d) => (
                  <div key={d} className="text-[11.5px] text-[var(--su)] py-1 font-medium">
                    {d}
                  </div>
                ))}
                {/* Empty slots for Mo, Tu, We (3-day offset) */}
                <div />
                <div />
                <div />
                {octDays.map((d) => (
                  <button
                    key={`oct-${d}`}
                    type="button"
                    onClick={() => {
                      setRangeEnd(`Oct ${d}, 2026`)
                    }}
                    className="h-[34px] rounded-[6px] border-0 text-[13px] cursor-pointer font-sans bg-[var(--in)] text-[var(--tx)] hover:opacity-90"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar matching Screenshot 5 */}
          <div className="flex flex-col sm:flex-row justify-between items-center border-t border-[var(--bd)] pt-3.5 gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-[8px] border border-[var(--bd)] bg-transparent text-[var(--tx)] text-[13px] font-bold cursor-pointer hover:bg-[var(--hv)] transition-colors"
              >
                Reset
              </button>
              <div className="px-3.5 py-2 rounded-[8px] border border-[var(--bd)] text-[13px] font-bold text-[var(--tx)] bg-[var(--sf)]">
                {rangeStart}
              </div>
              <span className="text-[var(--mu)] font-medium">—</span>
              <div className="px-3.5 py-2 rounded-[8px] border border-[var(--bd)] text-[13px] font-bold text-[var(--tx)] bg-[var(--sf)]">
                {rangeEnd}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-[8px] border border-[var(--bd)] bg-transparent text-[var(--tx)] text-[13px] font-bold cursor-pointer hover:bg-[var(--hv)] transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4.5 py-2 rounded-[8px] border-0 bg-[var(--pr)] text-white text-[13px] font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
