// KURA line illustrations: one stroke weight, rounded joins, theme colours
// (currentColor = foreground, var(--accent) and var(--gold) for highlights).

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Step 1 — phone with a PIN being entered. */
export function IlloSignup({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden {...base}>
      <circle cx="100" cy="80" r="64" fill="var(--accent-soft)" stroke="none" />
      <rect x="68" y="22" width="64" height="118" rx="12" fill="var(--surface)" />
      <path d="M90 32h20" />
      <rect x="78" y="48" width="44" height="22" rx="5" stroke="var(--accent)" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={86 + i * 9.5} cy="59" r="2.6" fill={i < 3 ? 'var(--accent)' : 'none'} stroke="var(--accent)" />
      ))}
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={86 + c * 14} cy={86 + r * 13} r="3.2" />),
      )}
      <path d="M150 40l6-6M156 52h8M150 28l2-8" stroke="var(--gold)" />
    </svg>
  )
}

/** Step 2 — a hub pin with a reserved, charged pack. */
export function IlloReserve({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden {...base}>
      <circle cx="100" cy="80" r="64" fill="var(--accent-soft)" stroke="none" />
      <path d="M36 128c22-10 40 6 64-4s44-12 64-2" strokeDasharray="2 7" />
      <path
        d="M100 122s-34-30-34-58a34 34 0 0168 0c0 28-34 58-34 58z"
        fill="var(--surface)"
      />
      <rect x="86" y="46" width="28" height="38" rx="5" stroke="var(--accent)" />
      <path d="M95 42h10" stroke="var(--accent)" />
      <path d="M102 54l-6 11h9l-6 11" stroke="var(--gold)" />
      <circle cx="150" cy="44" r="12" fill="var(--surface)" />
      <path d="M144 44l4 4 8-8" stroke="var(--accent)" />
    </svg>
  )
}

/** Step 3 — hand-over: empty pack in, full pack out. */
export function IlloSwap({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden {...base}>
      <circle cx="100" cy="80" r="64" fill="var(--accent-soft)" stroke="none" />
      <rect x="40" y="56" width="40" height="60" rx="7" fill="var(--surface)" />
      <path d="M53 50h14" />
      <rect x="47" y="100" width="26" height="9" rx="2" />
      <rect x="120" y="44" width="40" height="72" rx="7" fill="var(--surface)" stroke="var(--accent)" />
      <path d="M133 38h14" stroke="var(--accent)" />
      <rect x="127" y="56" width="26" height="53" rx="3" fill="var(--accent)" stroke="none" opacity="0.85" />
      <path d="M143 66l-6 12h9l-6 12" stroke="var(--on-accent)" />
      <path d="M86 70h26m-7-7l7 7-7 7" stroke="var(--gold)" />
      <path d="M112 96H86m7 7l-7-7 7-7" />
    </svg>
  )
}

/** QR-ish block for the booking pass mock (decorative, not scannable). */
export function QrMock({ className = '' }: { className?: string }) {
  const cells = [
    '1110111', '1010101', '1110111', '0001000', '1101011', '0110110', '1011101',
  ]
  return (
    <svg viewBox="0 0 70 70" className={className} aria-hidden>
      {cells.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '1' ? <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="9" height="9" rx="1.5" fill="currentColor" /> : null,
        ),
      )}
    </svg>
  )
}
