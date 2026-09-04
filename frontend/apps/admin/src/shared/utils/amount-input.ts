export function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [whole = '', ...fractionParts] = cleaned.split('.')
  if (fractionParts.length === 0) return whole
  return `${whole}.${fractionParts.join('').slice(0, 2)}`
}

export function formatAmountInput(value: string): string {
  const sanitized = sanitizeAmountInput(value)
  if (!sanitized) return ''

  const [whole, fraction] = sanitized.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (fraction === undefined) return grouped
  return `${grouped}.${fraction}`
}

export function formatAmountInputFromNumber(value: number): string {
  if (!Number.isFinite(value)) return ''
  return formatAmountInput(value.toFixed(2))
}

export function parseAmountInput(value: string): number {
  const sanitized = sanitizeAmountInput(value)
  if (!sanitized || sanitized === '.') return Number.NaN
  return Number.parseFloat(sanitized)
}

export function stripTrailingZeroCents(value: string): string {
  return value.endsWith('.00') ? value.slice(0, -3) : value
}

export function countAmountCaretMarks(value: string, caret: number): number {
  return (value.slice(0, Math.max(0, caret)).match(/[\d.]/g) ?? []).length
}

export function amountCaretFromMarks(formatted: string, marks: number): number {
  if (marks <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i += 1) {
    if (/[\d.]/.test(formatted[i] ?? '')) {
      seen += 1
      if (seen >= marks) return i + 1
    }
  }
  return formatted.length
}

export function formatAmountInputChange(
  raw: string,
  caret: number | null,
): { next: string; caret: number } {
  const marks = countAmountCaretMarks(raw, caret ?? raw.length)
  const next = formatAmountInput(raw)
  return { next, caret: amountCaretFromMarks(next, marks) }
}

export function restoreAmountInputCaret(input: HTMLInputElement, caret: number) {
  const apply = () => {
    if (document.activeElement === input) {
      input.setSelectionRange(caret, caret)
    }
  }
  apply()
  requestAnimationFrame(() => requestAnimationFrame(apply))
}

export function amountFieldProps(value: string, onChange: (next: string) => void) {
  return {
    inputMode: 'decimal' as const,
    value: formatAmountInput(value),
    onFocus: (event: { currentTarget: HTMLInputElement }) => {
      const input = event.currentTarget
      const stripped = stripTrailingZeroCents(input.value)
      if (stripped === input.value) return
      const marks = countAmountCaretMarks(
        input.value,
        input.selectionStart ?? stripped.length,
      )
      onChange(stripped)
      restoreAmountInputCaret(input, amountCaretFromMarks(stripped, marks))
    },
    onChange: (event: { currentTarget: HTMLInputElement }) => {
      const input = event.currentTarget
      const { next, caret } = formatAmountInputChange(
        input.value,
        input.selectionStart,
      )
      onChange(next)
      restoreAmountInputCaret(input, caret)
    },
  }
}
