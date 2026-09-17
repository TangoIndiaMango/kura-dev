/** Bay triage / override / abort reasons — labels go to audit trails (never PIN). */

export const HUB_MISMATCH_REASONS = [
  { value: 'face_mismatch', label: 'Face does not match photo on file' },
  { value: 'wrong_person', label: 'Rider not present / wrong person' },
  { value: 'photo_unclear', label: 'Photo unclear — cannot verify' },
  { value: 'suspected_fraud', label: 'Suspected fraud' },
] as const

export const HUB_OVERRIDE_REASONS = [
  { value: 'face_exception', label: 'Face match exception (supervisor)' },
  { value: 'kyc_pending', label: 'KYC pending exception' },
  { value: 'payment_exception', label: 'Payment exception' },
  { value: 'ops_discretion', label: 'Operational discretion' },
] as const

export const HUB_ABORT_REASONS = [
  { value: 'wrong_pack', label: 'Wrong pack selected' },
  { value: 'rider_left', label: 'Rider left bay' },
  { value: 'equipment', label: 'Equipment / bay issue' },
  { value: 'safety', label: 'Safety stop' },
] as const

export function reasonLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value
}
