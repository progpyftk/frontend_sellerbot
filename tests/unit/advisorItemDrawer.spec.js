// @vitest-environment jsdom
/**
 * Drawer de drill-down do anúncio (PROMO-IA-45).
 *
 * O dono pediu: "se o user clicar na linha ele ve tudo — promoções ofertadas,
 * ativas, programadas, dados do anúncio". Cobrimos as 5 seções e a separação
 * correta dos buckets.
 */
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import AdvisorItemDrawer from 'src/components/advisor/AdvisorItemDrawer.vue';

const DETALHE = {
  success: true,
  consulted_at: '2026-09-22T10:00:00Z',
  item: {
    item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', account_id: 'ACC1',
    account_nickname: 'MOGIVITTA', status: 'active', price: 100,
    thumbnail: null, permalink: 'https://produto.mercadolivre.com.br/MLB-1',
    sales_30d: 5, health: 'medio', health_info: { units_per_week: 1.2 },
  },
  promotions: {
    active: [{
      promotion_id: 'A1', promotion_type: 'PRICE_DISCOUNT', name: 'Oferta do dia',
      status: 'started', discount_pct: 30, start_date: '2026-09-01T00:00:00Z',
      finish_date: '2026-09-30T00:00:00Z',
      financials: { proposed_price: 70, estimated_margin_pct: 18.4, estimated_profit_unit: 8 },
    }],
    scheduled: [{
      promotion_id: 'S1', promotion_type: 'DEAL', name: 'Programada',
      status: 'pending', discount_pct: 20, start_date: '2026-10-01T00:00:00Z',
      financials: { proposed_price: 80, estimated_margin_pct: 25, estimated_profit_unit: 12 },
    }],
    candidates: [{
      promotion_id: 'C1', promotion_type: 'LIGHTNING', name: 'Relâmpago',
      status: 'candidate', discount_pct: 45,
      financials: {
        proposed_price: 55, estimated_margin_pct: 5, estimated_profit_unit: 2,
        price_range: { min: 50, max: 60 },
      },
    }],
  },
  promotion_state: { state: 'active' },
  last_action: { state: 'executed_verified', at: '2026-09-22T10:00:00Z' },
  next_step: { owner: 'none', label: 'Nenhuma pendência registrada' },
  financials: {
    execution_estimate: { at: '2026-09-21T10:00:00Z', price: 480, gate: { margin_pct: 30.9, profit: 148.12 } },
    snapshot_estimate: { at: '2026-09-22T10:00:00Z', price: 480, margin_pct: 42.5, profit_unit: 204,
      shipping_cost: 80, cmv_unit: 120 },
    realized: null,
  },
  agent_logs: [
    { created_at: '2026-09-06T21:53:00Z', acao: 'aprofundar', event_type: 'action',
      execution_status: 'executed', reason: 'parado sob promoção' },
  ],
};

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>', props: ['label'] },
  'router-link': { template: '<a><slot /></a>' },
};

const montar = (props = {}) => mount(AdvisorItemDrawer, {
  props: { detalhe: DETALHE, carregando: false, erro: '', ...props },
  global: { stubs },
});

describe('AdvisorItemDrawer', () => {
  it('mostra as 5 seções do processo — ofertadas, ativas, programadas, dados e histórico', () => {
    const texto = montar().text();
    expect(texto).toContain('Ofertadas');
    expect(texto).toContain('Ativas');
    expect(texto).toContain('Programadas');
    expect(texto).toContain('Dados do anúncio');
    expect(texto).toContain('Decisões registradas');
  });

  it('cada bucket mostra a promoção certa, com preço, desconto e margem', () => {
    const texto = montar().text();
    expect(texto).toContain('Oferta do dia');
    expect(texto).toContain('Programada');
    expect(texto).toContain('Relâmpago');
    expect(texto).toContain('18,4%');   // margem da ativa
    expect(texto).toContain('25,0%');   // margem da programada
    expect(texto).toContain('5,0%');    // margem da ofertada
  });

  it('separa a estimativa da execução da estimativa posterior do retrato', () => {
    const texto = montar().text();
    expect(texto).toContain('Na execução');
    expect(texto).toContain('30,9%');
    expect(texto).toContain('No retrato');
    expect(texto).toContain('42,5%');
    expect(texto).toContain('Resultado realizado ainda não medido');
  });

  it('traz os dados do anúncio e o histórico com o motivo', () => {
    const texto = montar().text();
    expect(texto).toContain('U-25');
    expect(texto).toContain('MOGIVITTA');
    expect(texto).toContain('1,2 un./semana');
    expect(texto).toContain('parado sob promoção');
    expect(montar().find('a[href="https://produto.mercadolivre.com.br/MLB-1"]').exists()).toBe(true);
  });

  it('estado de carregamento e erro aparecem antes de qualquer seção', () => {
    expect(montar({ detalhe: null, carregando: true }).text()).toContain('Carregando o retrato');
    const comErro = montar({ detalhe: null, erro: 'Fila indisponível' });
    expect(comErro.text()).toContain('Fila indisponível');
    expect(comErro.text()).not.toContain('Dados do anúncio');
  });

  it('leva foco ao abrir, fecha com Escape e devolve foco ao controle de origem', async () => {
    const origem = document.createElement('button');
    document.body.appendChild(origem);
    origem.focus();
    const wrapper = mount(AdvisorItemDrawer, {
      attachTo: document.body,
      props: { detalhe: DETALHE, carregando: false, erro: '' },
      global: { stubs },
    });
    await nextTick();
    expect(document.activeElement).toBe(wrapper.find('aside').element);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('fechar')).toBeTruthy();
    wrapper.unmount();
    expect(document.activeElement).toBe(origem);
    origem.remove();
  });

  it('tem o botão de enviar para revisão e mostra o estado enviado (PROMO-IA-47, portado)', () => {
    const emviado = montar({ revisaoEstado: 'enviado' });
    expect(emviado.text()).toContain('Enviar para revisão');
    expect(emviado.text()).toContain('Anúncios · Revisão');
    const comErro = montar({ revisaoEstado: 'erro', revisaoMensagem: 'Fila cheia' });
    expect(comErro.text()).toContain('Fila cheia');
  });
});
