// Small UI icons (24px grid, 1.8 stroke). Decorative unless labelled by the caller.

type P = { className?: string }
const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

export const IconArrow = ({ className = 'h-4 w-4' }: P) => (
  <svg {...s} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const IconSun = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
export const IconMoon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></svg>
)
export const IconBolt = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
)
export const IconPin = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
)
export const IconQr = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </svg>
)
export const IconCard = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></svg>
)
export const IconCash = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v.01M18 14.5v.01" /></svg>
)
export const IconReceipt = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
)
export const IconCalendar = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
)
export const IconSolar = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M4 14l2-8h12l2 8H4zM8 6l-1 8M16 6l1 8M5 10h14M12 14v4M8 21h8" /></svg>
)
export const IconUsers = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.7 3 2.4 3.5 5.2" /></svg>
)
export const IconGauge = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M4 18a8 8 0 1116 0" /><path d="M12 14l4-5" /><circle cx="12" cy="14" r="1.2" /></svg>
)
export const IconWifiOff = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 016.3-2.9M19 12.9a10 10 0 00-2.4-1.7M2 9.3a15 15 0 015-2.8M22 9.3A15 15 0 0011.7 5" /><circle cx="12" cy="20" r=".8" /></svg>
)
export const IconPlus = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconChat = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><path d="M20 12a8 8 0 01-11.7 7.1L4 20l1-4.1A8 8 0 1120 12z" /></svg>
)
export const IconMail = ({ className = 'h-5 w-5' }: P) => (
  <svg {...s} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 13l8.5-6.5" /></svg>
)
