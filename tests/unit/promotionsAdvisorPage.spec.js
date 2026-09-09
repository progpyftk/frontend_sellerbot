// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPromoOverview = vi.fn()

vi.mock('src/services/MercadoLivreService', () => ({
  default: {
    getPromoOverview: (...args) => getPromoOverview(...args),
    getPromotionsAdvisor: vi.fn().mockResolvedValue({ data: {} }),
    getPromoOverviewDetail: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import PromotionsAdvisorPage from 'src/pages/PromotionsAdvisorPage.vue'

// Stubs mínimos dos Q-components e dos Sb componentes.
const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon'],
    // `emits` evita o duplo disparo: sem declarar, o listener do pai também vira
    // atributo DOM no root do stub e o clique é contado duas vezes.
    emits: ['click'],
    template: '<button class="stub-btn" :disabled="!!disable" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
  'q-input': {
    props: ['modelValue', 'placeholder', 'ariaLabel', 'type'],
    emits: ['update:modelValue'],
    template: '<input class="stub-input" :type="type || \'text\'" :placeholder="placeholder" :aria-label="ariaLabel" :value="modelValue ?? \'\'" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'q-select': {
    props: ['modelValue', 'options', 'ariaLabel', 'label'],
    emits: ['update:modelValue'],
    template: '<select class="stub-select" :aria-label="ariaLabel || label" :value="modelValue ?? \'\'" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
  },
  'q-expansion-item': { template: '<div class="stub-expansion"><slot /></div>' },
  'q-dialog': { props: ['modelValue'], template: '<div class="stub-dialog" v-if="modelValue"><slot /></div>' },
  'q-icon': { props: ['name'], template: '<i class="stub-icon" :data-icon="name" />' },
  'q-spinner-dots': { template: '<span class="stub-spinner" />' },
  SbPageHeader: { template: '<header class="stub-header"><slot name="actions" /></header>' },
  SbTable: { props: ['scrollX'], template: '<table class="stub-table"><slot /></table>' },
  SbBadge: {
    props: ['variant', 'icon', 'title'],
    template: '<span class="stub-badge" :data-variant="variant" :data-icon="icon" :title="title"><slot /></span>',
  },
  SbEmptyState: {
    props: ['title', 'message', 'variant'],
    template: '<div class="stub-empty" :data-variant="variant">{{ title }} {{ message }}<slot name="action" /></div>',
  },
  PromoOverviewDetail: { props: ['itemId'], template: '<div class="stub-detail" />' },
  'q-btn-toggle': { template: '<div class="stub-toggle"><slot /></div>' },
}

const payload = () => ({
  results: [{
    item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', account_id: 'ACC1',
    account_nickname: 'Mogi', status: 'active', price: 100, sales_30d: 5,
    health: 'medio', health_info: { units_per_week: 2 }, cmv_unit: 40,
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
  }, {
    item_id: 'MLB2', title: 'Adubo 1kg', sku: 'A-1', account_id: 'ACC1',
    account_nickname: 'Mogi', status: 'active', price: 50, sales_30d: 0,
    health: 'parado', health_info: { units_per_week: 0 }, cmv_unit: 20,
    has_active_promo: false, active_promo: null, origem: null,
    margin_pct: null, profit_unit: null, estimable: false, missing_inputs: ['shipping'],
    below_floor: false, agent_last: null,
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

  it('mostra os números do escopo no topo e não os recalcula ao filtrar (bug do dono: "5 do assistente")', async () => {
    const wrapper = await mountAndSettle()
    const chips = () => wrapper.findAll('button.pv-scope__kpi').map((c) => c.text().replace(/\s+/g, ' ').trim())
    // "abaixo do piso" saiu da faixa de escopo: quem responde isso é o cartão
    // "Requer atenção hoje", com botão de priorização.
    const expected = [
      '753 anúncios',
      '563 com promoção ativa',
      '44 com indício do assistente',
      '120 já passaram pelo assistente',
    ]
    expect(chips()).toEqual(expected)

    await wrapper.findAll('button.pv-scope__kpi')[2].trigger('click') // indício do assistente
    await flushPromises()
    const action = wrapper.findAll('button').find((b) => b.text().includes('Ver e priorizar'))
    await action.trigger('click') // abaixo do piso (cartão de atenção)
    await flushPromises()

    const last = getPromoOverview.mock.calls.at(-1)[0]
    expect(last.below_floor).toBe(1)
    expect(last.origem).toBe('assistente')
    // ...e os números continuam os do escopo (nada de contagem do conjunto filtrado).
    expect(chips()).toEqual(expected)
  })

  it('faixa de decisão responde as três perguntas e "Ver e priorizar" ordena pelo pior caso', async () => {
    const wrapper = await mountAndSettle()
    const text = wrapper.text()
    expect(text).toContain('Requer atenção hoje')
    expect(text).toContain('O que o assistente sugere')
    expect(text).toContain('Protegido / bloqueado')
    expect(text).toContain('169')
    expect(text).toContain('Sugestão da régua — nada é alterado no Mercado Livre')

    const action = wrapper.findAll('button').find((b) => b.text().includes('Ver e priorizar'))
    expect(action).toBeTruthy()
    await action.trigger('click')
    await flushPromises()
    const last = getPromoOverview.mock.calls.at(-1)[0]
    expect(last.below_floor).toBe(1)
    expect(last.sort).toBe('margin')
  })

  it('tabela responde na ordem pedida: anúncio, situação, sugestão, margem, lucro', async () => {
    const wrapper = await mountAndSettle()
    const headers = wrapper.findAll('table.stub-table thead th').map((th) => th.text().trim()).filter(Boolean)
    expect(headers.slice(0, 5)).toEqual(['Anúncio', 'Situação', 'Sugestão', 'Margem', 'Lucro'])

    const text = wrapper.text()
    expect(text).toContain('Bloqueado: piso')      // situação honesta
    expect(text).toContain('Sem ação') // sugestão da régua
    expect(text).toContain('Sem dados')            // anúncio sem cálculo
    expect(text).toContain('Revisar anúncio')      // parado → revisão
    expect(text).toContain('18,4%')
    expect(text).toContain('Aprofundou')  // última ação com verbo legível
  })

  it('preset padrão é o enxuto "Assistente": sem CMV/preço promo na primeira leitura', async () => {
    const wrapper = await mountAndSettle()
    const headers = wrapper.findAll('table.stub-table thead th').map((th) => th.text().trim()).filter(Boolean)
    expect(headers).not.toContain('CMV')
    expect(headers).not.toContain('Preço promo')
    expect(headers).not.toContain('Datas promo')
  })

  it('filtros avançados ficam escondidos por padrão e mandam os params certos quando abertos', async () => {
    const wrapper = await mountAndSettle()
    expect(wrapper.find('input[aria-label="Vendas 30d mínima"]').exists()).toBe(false)

    const toggle = wrapper.findAll('button').find((b) => b.text().includes('Filtros avançados'))
    await toggle.trigger('click')
    await flushPromises()

    await wrapper.find('input[aria-label="Vendas 30d mínima"]').setValue('3')
    await flushPromises()
    await wrapper.find('input[aria-label="Margem mínima"]').setValue('40')
    await flushPromises()

    const last = getPromoOverview.mock.calls.at(-1)[0]
    expect(last.min_sales_30d).toBe(3)
    expect(last.min_margin_pct).toBe(40)
  })

  it('estado de erro é de primeira classe: sem contagem, sem "Network Error" cru e com retry', async () => {
    getPromoOverview.mockRejectedValue({ message: 'Network Error' })
    const wrapper = await mountAndSettle()

    const text = wrapper.text()
    expect(text).toContain('Não conseguimos falar com o servidor agora')
    expect(text).not.toContain('Network Error')
    expect(text).not.toContain('0 resultados')
    expect(text).not.toContain('Requer atenção hoje') // nada de números falsos no erro
    expect(wrapper.findAll('button').some((b) => b.text().includes('Tentar novamente'))).toBe(true)
  })

  it('estado vazio com filtros ativos oferece limpar filtros', async () => {
    getPromoOverview.mockResolvedValue({
      data: { ...payload(), results: [], total: 0 },
    })
    const wrapper = await mountAndSettle()
    expect(wrapper.text()).toContain('Nenhum anúncio com esses filtros')

    const q = wrapper.find('input[aria-label="Buscar por título, MLB ou SKU"]')
    await q.setValue('inexistente')
    await flushPromises()
    expect(wrapper.text()).toContain('Limpar filtros')
  })

  it('mostra legenda semântica de cores/ícones abaixo da tabela', async () => {
    const wrapper = await mountAndSettle()
    const legend = wrapper.find('.pv-legend')
    expect(legend.exists()).toBe(true)
    expect(legend.text()).toContain('bloqueado pelo piso')
    expect(legend.text()).toContain('sugestão do assistente')
  })
})
