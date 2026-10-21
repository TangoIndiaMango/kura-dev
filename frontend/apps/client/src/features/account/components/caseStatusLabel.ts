/** Riders see plain status words; priority is an ops-only field. */
export function caseStatusLabel(status: string) {
  const s = status.toUpperCase()
  if (s === 'OPEN' || s === 'NEW') return 'Open'
  if (s === 'IN_PROGRESS' || s === 'PENDING') return 'In progress'
  if (s === 'WAITING_ON_CUSTOMER' || s === 'AWAITING_CUSTOMER') return 'Waiting for you'
  if (s === 'RESOLVED') return 'Resolved'
  if (s === 'CLOSED') return 'Closed'
  return status.replace(/_/g, ' ').toLowerCase()
}
