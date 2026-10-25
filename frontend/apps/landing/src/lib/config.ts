const env = import.meta.env

export const API_BASE_URL = (env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const APP_URL = (env.VITE_APP_URL as string | undefined) ?? 'https://kura-operator.vercel.app'
const WHATSAPP = ((env.VITE_WHATSAPP_NUMBER as string | undefined) ?? '2348139235205').replace(/\D/g, '')
/** Shown only when configured — no made-up short code. */
export const USSD_CODE = ((env.VITE_USSD_CODE as string | undefined) ?? '').trim()
export const SITE_URL = ((env.VITE_SITE_URL as string | undefined) ?? 'https://kuramobility.com').replace(/\/$/, '')

export const WHATSAPP_DISPLAY = `+${WHATSAPP.slice(0, 3)} ${WHATSAPP.slice(3, 6)} ${WHATSAPP.slice(6, 9)} ${WHATSAPP.slice(9)}`

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`
}

/**
 * Company facts used in the footer, contact and legal pages.
 * TODO(company): every value marked PLACEHOLDER must be confirmed before launch.
 */
export const COMPANY = {
  brand: 'KURA Mobility',
  legalName: 'KURA Mobility', // PLACEHOLDER — registered company name (e.g. "… Limited")
  rcNumber: '', // PLACEHOLDER — CAC RC number; hidden while empty
  address: 'Lagos, Nigeria', // PLACEHOLDER — registered office address
  hours: 'Hubs open from dawn · Support Mon–Sat, 7am–8pm WAT', // PLACEHOLDER
  email: 'support@kuramobility.com',
  socials: [] as { label: string; href: string }[], // e.g. { label: 'Instagram', href: '…' }
  legalUpdated: '25 October 2026',
}

/** Places on the way — edit as rollout plans change (no live data for these). */
export const COMING_SOON = [
  { name: 'Ibadan', state: 'Oyo' },
  { name: 'Abuja', state: 'FCT' },
  { name: 'Akure', state: 'Ondo' },
  { name: 'Port Harcourt', state: 'Rivers' },
  { name: 'Benin City', state: 'Edo' },
  { name: 'Kano', state: 'Kano' },
]

export type VehicleType = 'MOTORCYCLE' | 'TRICYCLE' | 'BOAT'

/**
 * Savings calculator assumption — a typical day's petrol for each vehicle.
 * Edit with current pump prices; the page labels the result as an estimate.
 */
export const PETROL_PER_DAY_NAIRA: Record<VehicleType, number> = {
  MOTORCYCLE: 2500,
  TRICYCLE: 4000,
  BOAT: 9000,
}

/** Typical KURA cost per working day (a day's swaps) for the same estimate. */
export const KURA_PER_DAY_NAIRA: Record<VehicleType, number> = {
  MOTORCYCLE: 1200,
  TRICYCLE: 1800,
  BOAT: 3500,
}

export const VEHICLES: { type: VehicleType; label: string; rider: string; short: string }[] = [
  { type: 'MOTORCYCLE', label: 'Motorcycle', rider: 'Okada riders', short: 'Okada' },
  { type: 'TRICYCLE', label: 'Tricycle', rider: 'Keke operators', short: 'Keke' },
  { type: 'BOAT', label: 'Boat', rider: 'Boat operators', short: 'Boat' },
]
