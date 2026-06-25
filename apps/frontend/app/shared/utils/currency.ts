const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

/** Convert integer cents to formatted dollar string: 1299 → "$12.99" */
export function formatCurrency(cents: number): string {
  return formatter.format(cents / 100)
}

/** Convert integer cents to dollar number: 1299 → 12.99 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/** Convert dollar number to integer cents: 12.99 → 1299 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}
