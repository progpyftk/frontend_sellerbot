// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FulfillmentSourceBadge from 'src/components/fulfillment/FulfillmentSourceBadge.vue'
import FulfillmentStepRail from 'src/components/fulfillment/FulfillmentStepRail.vue'

const iconStub = { template: '<i />' }

describe('fulfillment guided UI', () => {
  it('blocks future steps while keeping completed steps navigable', async () => {
    const wrapper = mount(FulfillmentStepRail, {
      props: { current: 'parameters', maxStep: 'review' },
      global: { stubs: { QIcon: iconStub } },
    })
    const steps = wrapper.findAll('button')

    expect(steps).toHaveLength(4)
    expect(steps[0].classes()).toContain('full-step--done')
    expect(steps[1].attributes('aria-current')).toBe('step')
    expect(steps[2].attributes('disabled')).toBeUndefined()
    expect(steps[3].attributes('disabled')).toBeDefined()

    await steps[0].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['health'])
  })

  it('labels unconfirmed data without presenting it as official', () => {
    const wrapper = mount(FulfillmentSourceBadge, {
      props: { source: 'unknown_source' },
      global: { stubs: { QIcon: iconStub } },
    })

    expect(wrapper.text()).toContain('Fonte não confirmada')
    expect(wrapper.classes()).toContain('full-source--unknown')
  })
})
