import { describe, expect, it } from 'vitest'
import { normalizeUsername } from '../../src/utils/username'

describe('normalizeUsername', () => {
  it('preserves hyphens used by read-only usernames', () => {
    expect(normalizeUsername('Admin-Read')).toBe('admin-read')
  })

  it('removes unsupported characters while preserving underscores', () => {
    expect(normalizeUsername('seller.bot+1_test')).toBe('sellerbot1_test')
  })
})
