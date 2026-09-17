/**
 * Formats a monetary amount in Nigerian Naira (₦).
 * Accepts either Naira (e.g. 1500) or Kobo (when fromKobo is true).
 */
export function formatNaira(
  amount: number | string | null | undefined,
  options: {
    fromKobo?: boolean
    showDecimals?: boolean
  } = {}
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₦0'
  }

  const { fromKobo = false, showDecimals = false } = options
  const numericAmount = Number(amount)
  const nairaValue = fromKobo ? numericAmount / 100 : numericAmount

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })
    .format(nairaValue)
    .replace('NGN', '₦')
}
