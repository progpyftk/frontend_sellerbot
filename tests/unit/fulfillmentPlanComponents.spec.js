// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FulfillmentPlanLines from 'src/components/fulfillment-plan/FulfillmentPlanLines.vue'
import FulfillmentPlanSummary from 'src/components/fulfillment-plan/FulfillmentPlanSummary.vue'
import FulfillmentStrategyBanner from 'src/components/fulfillment-plan/FulfillmentStrategyBanner.vue'

const iconStub = { template: '<i />' }
const paginationStub = { template: '<nav />', props: ['modelValue', 'max'] }

describe('fulfillment catalog plan UI', () => {
  it('writes the adaptive strategy and its evidence', () => {
    const wrapper = mount(FulfillmentStrategyBanner, {
      props: {
        strategy: {
          regime: 'availability_defense',
          rationale: 'Proteção de disponibilidade porque há ruptura próxima.',
          evidence: [{ metric: 'rupture_pressure', value: 0.25, label: 'itens próximos de ruptura' }],
        },
      },
      global: { stubs: { QIcon: iconStub } },
    })

    expect(wrapper.text()).toContain('Proteção de disponibilidade')
    expect(wrapper.text()).toContain('25%')
    expect(wrapper.text()).toContain('ruptura próxima')
  })

  it('shows a non-Full variation with quantity and dispatch deadline', () => {
    const wrapper = mount(FulfillmentPlanLines, {
      props: {
        loading: false,
        pagination: { page: 1, pageSize: 100, total: 1, hasNext: false },
        lines: [{
          id: 8,
          title: 'Produto candidato',
          variation_name: 'Azul',
          sku: 'SKU-AZUL',
          item_id_ml: 'MLB-8',
          action: 'start_full',
          effective_quantity: 7,
          dispatch_by: '2026-08-25',
          forecast: { daily_units: 0.8, confidence: 'medium', trend: 0.2 },
          inventory: { full_sellable: 0, erp_available: 12, coverage_before_days: 0 },
          economics: { contribution_margin_rate: 0.22, average_ticket: 79.9 },
          decision: { reasons: ['controlled_first_full_lot'], warnings: ['full_uplift_not_assumed'] },
        }],
      },
      global: { stubs: { QIcon: iconStub, QPagination: paginationStub } },
    })

    expect(wrapper.text()).toContain('Produto candidato')
    expect(wrapper.text()).toContain('Novo no Full')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('25/08/2026')
    expect(wrapper.text()).toContain('primeiro lote')
  })

  it('does not describe a blocked decision as units to send', () => {
    const wrapper = mount(FulfillmentPlanLines, {
      props: {
        loading: false,
        pagination: { page: 1, pageSize: 100, total: 1, hasNext: false },
        lines: [{
          id: 9,
          title: 'Produto em revisão',
          sku: 'SKU-REVIEW',
          item_id_ml: 'MLB-9',
          action: 'data_review',
          effective_quantity: null,
          need_quantity: 10,
          forecast: { daily_units: 0.4, confidence: 'low' },
          inventory: {},
          economics: {},
          decision: { reasons: ['forecast_confidence_low'], warnings: [] },
        }],
      },
      global: { stubs: { QIcon: iconStub, QPagination: paginationStub } },
    })

    expect(wrapper.text()).toContain('sem separação')
    expect(wrapper.text()).toContain('Sem envio')
    expect(wrapper.text()).not.toContain('necessidade 10 · confirmar ERP')
  })

  it('labels partial capital as incomplete instead of zero total', () => {
    const wrapper = mount(FulfillmentPlanSummary, {
      props: {
        summary: {
          actionable_by_action: { replenish_full: 2, start_full: 1, next_cycle: 0 },
          data_review: 3,
          estimated_capital: null,
          known_estimated_capital: 120,
        },
        activeActions: [],
      },
      global: { stubs: { QIcon: iconStub } },
    })

    expect(wrapper.text()).toMatch(/120,00\+/)
    expect(wrapper.text()).toContain('total incompleto')
  })

  it('does not display zero when every actionable cost is unknown', () => {
    const wrapper = mount(FulfillmentPlanSummary, {
      props: {
        summary: {
          actionable_by_action: { replenish_full: 0, start_full: 2, next_cycle: 0 },
          estimated_capital: null,
          known_estimated_capital: 0,
          capital_missing_lines: 2,
        },
        activeActions: [],
      },
      global: { stubs: { QIcon: iconStub } },
    })

    expect(wrapper.text()).toContain('Não calculado')
    expect(wrapper.text()).toContain('custo atual ausente')
    expect(wrapper.text()).not.toMatch(/R\$\s*0/)
  })
})
