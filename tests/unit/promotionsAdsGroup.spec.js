// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PromotionsAdsGroup from 'src/components/promotions-ads/PromotionsAdsGroup.vue'

// Stubs mínimos das Q-components — preservam slots/props relevantes.
const QCheckbox = { name: 'QCheckbox', props: ['modelValue', 'disable'], template: '<span class="stub-checkbox" :data-disabled="!!disable" />' }
const QIcon = { name: 'QIcon', props: ['name'], template: '<i class="stub-icon" :data-name="name" />' }
const QBtn = { name: 'QBtn', props: ['label', 'loading', 'disable'], template: '<button class="stub-btn" :data-loading="!!loading" :data-disabled="!!disable">{{ label }}</button>' }

const fin = (over = {}) => ({ estimable: true, discount_pct: null, proposed_price: 50, estimated_profit_unit: 10, estimated_margin_pct: 20, ...over })

function makeGroup () {
  return {
    key: 'ACC-1',
    account_nickname: 'Loja Teste',
    ads: [{
      _key: 'MLB1##',
      account_id: 'ACC-1', item_id: 'MLB1', title: 'Calcário 3Kg', sku: 'CAL-3',
      current_price: 55.3,
      promotions: [
        { _key: 'pd-cand', promotion_type: 'PRICE_DISCOUNT', typeLabel: 'Desconto individual',
          status: 'candidate', can_manual_activate: true, financials: fin() },
        { _key: 'pd-live', promotion_type: 'PRICE_DISCOUNT', typeLabel: 'Desconto individual',
          status: 'started', can_manual_activate: true, financials: fin({ discount_pct: 9.6 }) },
        { _key: 'smart-live', promotion_type: 'SMART', typeLabel: 'Campanha Smart',
          status: 'started', can_manual_activate: true, financials: fin({ discount_pct: 10.7 }) },
      ],
    }],
  }
}

const mountGroup = (props = {}) => mount(PromotionsAdsGroup, {
  props: { group: makeGroup(), actionMode: 'activate', ...props },
  global: { stubs: { QCheckbox, QIcon, QBtn } },
})

describe('PromotionsAdsGroup', () => {
  it('mostra checkbox de seleção nas promoções disponíveis (regressão: "sumiram os checkboxes")', () => {
    const w = mountGroup()
    // a linha "Disponíveis" tem 1 promo ativável → 1 checkbox
    expect(w.findAll('.stub-checkbox').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra checkboxes no modo remoção também', () => {
    const w = mountGroup({ actionMode: 'remove' })
    // modo remoção: checkbox em toda promo (ativas removíveis + candidatas desabilitadas)
    expect(w.findAll('.stub-checkbox').length).toBeGreaterThanOrEqual(2)
  })

  it('oferece "Editar %" só nas promoções ativas de tipo editável (PRICE_DISCOUNT)', () => {
    const w = mountGroup()
    const editBtns = w.findAll('.stub-btn').filter((b) => b.text() === 'Editar %')
    expect(editBtns).toHaveLength(1) // só a PRICE_DISCOUNT ativa; a SMART ativa não
  })

  it('emite edit-active ao clicar em "Editar %"', async () => {
    const w = mountGroup()
    const btn = w.findAll('.stub-btn').find((b) => b.text() === 'Editar %')
    await btn.trigger('click')
    expect(w.emitted('edit-active')).toBeTruthy()
    expect(w.emitted('edit-active')[0][0].promo._key).toBe('pd-live')
  })

  it('trava o botão "Editar %" enquanto outra linha está em edição (editingBusyKey)', () => {
    const w = mountGroup({ editingBusyKey: 'OUTRA##linha' })
    const btn = w.findAll('.stub-btn').find((b) => b.text() === 'Editar %')
    expect(btn.attributes('data-disabled')).toBe('true')
  })
})
