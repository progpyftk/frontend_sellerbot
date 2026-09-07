// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPromoOverview = vi.fn()

vi.mock('src/services/MercadoLivreService', () => ({
  default: {
    getPromoOverview: (...args) => getPromoOverview(...args),
    getPromotionsAdvisor: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import PromotionsAdvisorPage from 'src/pages/PromotionsAdvisorPage.vue'

// Stubs mínimos dos Q-components e dos Sb componentes.
const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable'],
    template: '<button class="stub-btn" :disabled="!!disable" @click="$emit(\'click\')"><slot />{{ label }}</button>',
  },
  'q-input': {
    props: ['modelValue', 'placeholder', 'ariaLabel'],
    emits: ['update:modelValue'],
    template: '<input class="stub-input" :placeholder="placeholder" :aria-label="ariaLabel" :value="modelValue ?? \'\'" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'q-select': {
    props: ['modelValue', 'options', 'ariaLabel'],
    emits: ['update:modelValue'],
    template: '<select class="stub-select" :aria-label="ariaLabel" :value="modelValue ?? \'\'" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
  },
  'q-expansion-item': { template: '<div class="stub-expansion"><slot /></div>' },
  SbPageHeader: { template: '<header class="stub-header"><slot name="actions" /></header>' },
  SbTable: { props: ['scrollX'], template: '<table class="stub-table"><slot /></table>' },
  SbBadge: { template: '<span class="stub-badge"><slot /></span>' },
  SbEmptyState: { props: ['title'], template: '<div class="stub-empty">{{ title }}</div>' },
  PromoOverviewDetail: { props: ['itemId'], template: '<div class="stub-detail" />' },
  'q-btn-toggle': { template: '<div class="stub-toggle"><slot /></div>' },
  'q-dialog': { props: ['modelValue'], template: '<div class="stub-dialog" v-if="modelValue"><slot /></div>' },
}

const payload = () => ({
  results: [{
    item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', account_id: 'ACC1',
    account_nickname: 'Mogi', status: 'active', price: 100, sales_30d: 5,
    health: 'medio', health_info: null, cmv_unit: 40,
    has_active_promo: true,
    active_promo: {
      promotion_type: 'PRICE_DISCOUNT', promotion_name: '', buyer_price: 70,
      discount_pct: 30, start_date: '2026-09-01T00:00:00Z', finish_date: null,
    },
    origem: 'assistente', margin_pct: 18.4, profit_unit: 8, estimable: true,
    below_floor: true,
    agent_last: {
      created_at: '2026-09-06T21:53:00Z', acao: 'aprofundar',
      promotion_type: 'PRICE_DISCOUNT', deal_price: 728, discount_pct: 30, reason: '',
    },
  }],
  total: 2,
  page: 1,
  page_size: 40,
  summary: { ads: 753, with_active_promo: 563, below_floor: 169, assistente: 44, agent_history: 120 },
  snapshot: { computed_at: '2026-09-07T19:26:00Z', stale: false, empty: false },
})

function mountPage () {
  return mount(PromotionsAdvisorPage, { global: { stubs } })
}

async function mountAndSettle () {
  const wrapper = mountPage()
  await flushPromises()
  return wrapper
}

describe('PromotionsAdvisorPage', () => {
  beforeEach(() => {
    getPromoOverview.mockReset()
    getPromoOverview.mockResolvedValue({ data: payload() })
  })

  it('mostra os KPIs do escopo e não os recalcula ao clicar nos chips (bug do dono: "5 do assistente")', async () => {
    const wrapper = await mountAndSettle()
    const chips = () => wrapper.findAll('button.pv-chip').map((c) => c.text())
    const expected = [
      '753 anúncios',
      '563 com promo ativa',
      '169 abaixo do piso',
      '44 ativas com registro do assistente',
      '120 com ação no histórico',
    ]
    expect(chips()).toEqual(expected)

    // Combina os dois facets: a tabela recebe os dois filtros...
    await wrapper.findAll('button.pv-chip')[2].trigger('click') // abaixo do piso
    await flushPromises()
    await wrapper.findAll('button.pv-chip')[3].trigger('click') // ativas com registro
    await flushPromises()

    const last = getPromoOverview.mock.calls.at(-1)[0]
    expect(last.below_floor).toBe(1)
    expect(last.origem).toBe('assistente')
    // ...e os números continuam os do escopo (nada de contagem do conjunto filtrado).
    expect(chips()).toEqual(expected)
  })

  it('fila de filtros por coluna: faixa de margem, vendas mínimas e promo ativa chegam como params', async () => {
    const wrapper = await mountAndSettle()
    const salesMin = wrapper.find('input[aria-label="Vendas 30d mínima"]')
    await salesMin.setValue('3')
    await flushPromises()
    const marginMin = wrapper.find('input[aria-label="Margem mínima"]')
    await marginMin.setValue('40')
    await flushPromises()
    const promoSelect = wrapper.find('select[aria-label="Filtrar por promo ativa"]')
    await promoSelect.setValue('has_promo')
    await flushPromises()

    const last = getPromoOverview.mock.calls.at(-1)[0]
    expect(last.min_sales_30d).toBe(3)
    expect(last.min_margin_pct).toBe(40)
    expect(last.has_promo).toBe(1)
    expect(last.origem).toBeUndefined() // "com promo ativa" não é origem
  })

  it('tabela completa: saúde, preço-base, CMV, ativação do assistente e datas', async () => {
    const wrapper = await mountAndSettle()
    // pt-BR usa espaço não-separável (U+00A0) após "R$" — regex tolerante.
    const brlOf = (n) => new RegExp(`R\\$[\\s\\u00A0]${n},00`)
    const text = wrapper.text()
    expect(text).toContain('Médio')                 // badge de saúde
    expect(text).toMatch(brlOf('100'))              // preço-base
    expect(text).toMatch(brlOf('40'))               // CMV
    expect(text).toContain('Aprofundar')            // badge da última ação do assistente
    expect(text).toContain('→ …')                   // promo sem data de fim (fuso: 00:00Z vira dia anterior)
  })
})
