// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

const nav = vi.hoisted(() => ({
  replace: null,
  route: { query: {} },
}))

vi.mock('vue-router', () => ({
  useRoute: () => nav.route,
  useRouter: () => ({ replace: nav.replace }),
}))

vi.mock('src/services/MercadoLivreService', () => ({
  default: {
    listAccounts: vi.fn().mockResolvedValue({ data: {} }),
    getAnalyticsItems: vi.fn().mockRejectedValue(new Error('no items')),
    getAnalyticsItemsLegacy: vi.fn().mockRejectedValue(new Error('no items')),
  },
}))

import { useItemAnalytics } from '../../src/composables/useItemAnalytics'
import { COMBINE_DEFAULT_METRICS } from '../../src/utils/itemAnalytics'

function mountComposable() {
  let api
  const Component = defineComponent({
    setup() {
      api = useItemAnalytics()
      return () => null
    },
  })
  const wrapper = mount(Component)
  return { wrapper, api }
}

describe('useItemAnalytics combine state', () => {
  beforeEach(() => {
    nav.route = { query: {} }
    nav.replace = vi.fn()
  })

  it('hydrates combine mode from URL', async () => {
    nav.route.query = { mode: 'combine' }
    const { api } = mountComposable()
    await flushPromises()
    expect(api.filters.mode).toBe('combine')
  })

  it('falls back to traffic for an unknown mode', async () => {
    nav.route.query = { mode: 'bogus' }
    const { api } = mountComposable()
    await flushPromises()
    expect(api.filters.mode).toBe('traffic')
  })

  it('hydrates a comma list of metrics, filtering invalid keys', async () => {
    nav.route.query = { metrics: 'price,conversion_rate,bogus' }
    const { api } = mountComposable()
    await flushPromises()
    expect(api.filters.metrics).toEqual(['price', 'conversion_rate'])
  })

  it('falls back to the default metric set when none are valid', async () => {
    nav.route.query = { metrics: 'nope,x,y' }
    const { api } = mountComposable()
    await flushPromises()
    expect(api.filters.metrics).toEqual(COMBINE_DEFAULT_METRICS)
  })

  it('setMetrics normalizes input and persists to the URL', async () => {
    const { api } = mountComposable()
    await flushPromises()
    api.setMetrics(['visits', 'garbage', 'price'])
    expect(nav.replace).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ metrics: 'visits,price' }) }),
    )
  })

  it('setMode accepts combine', async () => {
    const { api } = mountComposable()
    await flushPromises()
    api.setMode('combine')
    expect(api.filters.mode).toBe('combine')
    expect(nav.replace).toHaveBeenCalled()
  })
})
