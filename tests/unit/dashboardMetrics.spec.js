import { describe, expect, it } from 'vitest'

import { calculateNetMarginPct } from 'src/utils/dashboardMetrics'

describe('calculateNetMarginPct', () => {
  it('calculates profit after ads over gross GMV', () => {
    expect(calculateNetMarginPct(100, 30, 10)).toBe(20)
  })

  it('does not use net revenue as the denominator', () => {
    expect(calculateNetMarginPct(100, 30, 10)).not.toBe(25)
  })

  it('returns null when there is no GMV', () => {
    expect(calculateNetMarginPct(0, 30, 10)).toBeNull()
  })
})
