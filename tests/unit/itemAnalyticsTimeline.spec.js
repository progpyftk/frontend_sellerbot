// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ItemAnalyticsTimeline from '../../src/components/item-analytics/ItemAnalyticsTimeline.vue'
import { COMBINE_DEFAULT_METRICS } from '../../src/utils/itemAnalytics'

vi.mock('src/utils/plotly', () => ({ loadPlotly: vi.fn().mockResolvedValue(undefined) }))

const QCheckbox = {
  name: 'QCheckbox',
  props: ['modelValue', 'disable'],
  emits: ['update:model-value'],
  template: '<input type="checkbox" class="q-checkbox-input" :checked="modelValue" :disabled="disable" @change="e => $emit(\'update:model-value\', e.target.checked)" />',
}
const QToggle = {
  name: 'QToggle',
  props: ['modelValue', 'disable'],
  emits: ['update:model-value'],
  template: '<label><input type="checkbox" class="q-toggle-input" :checked="modelValue" :disabled="disable" @change="e => $emit(\'update:model-value\', e.target.checked)" /><span class="q-toggle-label">Tendência (0–100)</span></label>',
}

function makeTimeline(overrides = {}) {
  return {
    series: [
      { date: '2026-08-01', visits: 100, price: 50, conversion_rate: 5, available_quantity: 8, has_promotion: true },
      { date: '2026-08-02', visits: 120, price: 40, conversion_rate: 8, available_quantity: 6, has_promotion: true },
      { date: '2026-08-03', visits: 90, price: 40, conversion_rate: 7, available_quantity: 5, has_promotion: false },
    ],
    quality: { observed_days: 3, missing_days: [], partial: false },
    ...overrides,
  }
}

const plotly = { react: vi.fn(), purge: vi.fn() }

function mountTimeline(props = {}) {
  window.Plotly = plotly
  plotly.react.mockClear()
  plotly.purge.mockClear()
  return mount(ItemAnalyticsTimeline, {
    props: {
      timeline: makeTimeline(),
      mode: 'combine',
      metrics: [...COMBINE_DEFAULT_METRICS],
      loading: false,
      error: '',
      ...props,
    },
    global: {
      stubs: { QCheckbox, QToggle, QIcon: true, QTooltip: true, QBtnToggle: { props: ['modelValue'], emits: ['update:model-value'], template: '<div class="q-modetoggle" />' } },
    },
  })
}

const lastReactCall = () => plotly.react.mock.calls[plotly.react.mock.calls.length - 1]
const reactTraces = () => (lastReactCall() ? lastReactCall()[1] : [])
const reactLayout = () => (lastReactCall() ? lastReactCall()[2] : {})
const traceNames = () => reactTraces().map((trace) => trace.name)
const settle = async () => { await flushPromises(); await flushPromises() }

describe('ItemAnalyticsTimeline combine mode', () => {
  it('renders the metric checkbox panel grouped and the tendency toggle', async () => {
    const wrapper = mountTimeline()
    await settle()
    const text = wrapper.text()
    expect(text).toContain('Preço')
    expect(text).toContain('Conversão')
    expect(text).toContain('Visitas')
    expect(text).toContain('Tendência')
  })

  it('does not render the metric panel in preset modes', async () => {
    const wrapper = mountTimeline({ mode: 'traffic', metrics: [] })
    await settle()
    expect(wrapper.text()).not.toContain('Tendência')
    expect(wrapper.find('.q-toggle-input').exists()).toBe(false)
  })

  it('plots default metrics on nature axes with a third currency axis', async () => {
    const wrapper = mountTimeline()
    await settle()
    const byName = Object.fromEntries(reactTraces().map((trace) => [trace.name, trace]))
    expect(byName['Visitas'].yaxis).toBe('y')
    expect(byName['Conversão'].yaxis).toBe('y2')
    expect(byName['Preço'].yaxis).toBe('y3')
    expect(reactLayout().yaxis3).toBeDefined()
    expect(wrapper).toBeTruthy()
  })

  it('renders promotion as background shapes rather than a line trace', async () => {
    const wrapper = mountTimeline({ metrics: ['price', 'has_promotion'] })
    await settle()
    expect(traceNames()).not.toContain('Com promoção')
    expect(reactLayout().shapes.length).toBe(1)
    expect(reactLayout().shapes[0].type).toBe('rect')
    expect(wrapper).toBeTruthy()
  })

  it('normalizes selected series to 0–100 and fixes the axis ranges', async () => {
    const wrapper = mountTimeline()
    await settle()
    await wrapper.find('.q-toggle-input').setValue(true)
    await settle()
    const price = reactTraces().find((trace) => trace.name === 'Preço')
    expect(price.y).toEqual([100, 0, 0])
    expect(reactLayout().yaxis.range).toEqual([0, 100])
    expect(reactLayout().yaxis3.range).toEqual([0, 100])
  })

  it('emits update:metrics when a metric checkbox toggles', async () => {
    const wrapper = mountTimeline({ metrics: ['price', 'conversion_rate'] })
    await settle()
    const visitsChip = wrapper.findAll('.metric-chip').find((chip) => chip.text().includes('Visitas'))
    await visitsChip.find('.q-checkbox-input').setValue(true)
    expect(wrapper.emitted('update:metrics')).toBeTruthy()
    expect(wrapper.emitted('update:metrics')[0][0]).toContain('visits')
  })

  it('shows a select-metrics empty state when none are chosen', async () => {
    const wrapper = mountTimeline({ metrics: [] })
    await settle()
    const empty = wrapper.find('[class*="empty"]')
    expect(empty.exists()).toBe(true)
  })
})
