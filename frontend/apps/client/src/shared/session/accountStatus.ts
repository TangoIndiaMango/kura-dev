/** Copy for accounts the server will not let reserve (ACCOUNT_RESTRICTED). */
export function swapsPausedMessage(status: string | undefined): string | null {
  if (!status || status === 'ACTIVE') return null
  return 'Swaps are paused on your account. If you still have a KURA battery, return it at any hub — otherwise contact support.'
}
