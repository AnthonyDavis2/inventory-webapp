import { describe, it, expect } from 'vitest'
import { formatCurrency, centsToDollars, dollarsToCents } from './currency'

describe('dollarsToCents', () => {
  it('converts whole dollars', () => {
    expect(dollarsToCents(12)).toBe(1200)
  })

  it('converts dollars with cents', () => {
    expect(dollarsToCents(12.99)).toBe(1299)
  })

  it('rounds floating-point imprecision correctly', () => {
    // 1.005 in IEEE 754 is actually 1.00499999... — must round to 101, not 100
    expect(dollarsToCents(1.005)).toBe(101)
  })

  it('handles zero', () => {
    expect(dollarsToCents(0)).toBe(0)
  })

  it('handles large amounts', () => {
    expect(dollarsToCents(999999.99)).toBe(99999999)
  })
})

describe('centsToDollars', () => {
  it('converts cents to dollars', () => {
    expect(centsToDollars(1299)).toBe(12.99)
  })

  it('handles zero', () => {
    expect(centsToDollars(0)).toBe(0)
  })

  it('is the inverse of dollarsToCents for common values', () => {
    const amounts = [0, 1, 99, 100, 999, 1000, 9999, 99999]
    for (const cents of amounts) {
      expect(dollarsToCents(centsToDollars(cents))).toBe(cents)
    }
  })
})

describe('formatCurrency', () => {
  it('formats cents as USD string', () => {
    expect(formatCurrency(1299)).toBe('$12.99')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats whole dollar amounts with two decimal places', () => {
    expect(formatCurrency(100)).toBe('$1.00')
  })

  it('formats large amounts with comma separator', () => {
    expect(formatCurrency(1000000)).toBe('$10,000.00')
  })

  it('never produces a float representation (no rounding errors in display)', () => {
    // 1005 cents = $10.05 — must not display as $10.049999...
    expect(formatCurrency(1005)).toBe('$10.05')
  })
})
