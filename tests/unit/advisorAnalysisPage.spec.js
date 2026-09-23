// @vitest-environment jsdom
/**
 * Aba Análises (PROMO-IA-45) — a tabela de análises, 1 linha por anúncio.
 *
 * O que protegem:
 * - as colunas novas aparecem (margem-base, última atualização, nº de ofertadas);
 * - os chips de recorte contam por situação e filtram a tabela ao clicar;
 * - clicar na linha abre o drawer com o detalhe ao vivo (ofertadas/ativas/programadas);
 * - deep-link ?item=MLB… abre o drawer direto (o Hoje já emite esse link);
 * - fechar o drawer limpa o parâmetro da URL.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCatalog = vi.fn();
const getItemDetail = vi.fn();
const getAutomation = vi.fn();
const patchAutomation = vi.fn();
const enqueueForReview = vi.fn();
const replace = vi.fn();

vi.mock('src/services/AdvisorService', () => ({
  default: {
    getCatalog: (...a) => getCatalog(...a),
    getItemDetail: (...a) => getItemDetail(...a),
    getAutomation: (...a) => getAutomation(...a),
    patchAutomation: (...a) => patchAutomation(...a),
    enqueueForReview: (...a) => enqueueForReview(...a),
  },
}));

const routeMock = { query: {}, path: '/app/promotions/advisor', meta: {} };
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ replace }),
}));

import AdvisorAnalysisPage from 'src/pages/advisor/AdvisorAnalysisPage.vue';
import { SITUATION_META } from 'src/utils/advisorDecision';

const LINHA = {
  account_id: 'ACC1', account_nickname: 'MOGIVITTA',
  item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', status: 'active',
  price: 100, buyer_price: 70, discount_pct: 30, sales_30d: 5,
  health: 'medio', health_info: { units_per_week: 1.2 },
  cmv_unit: 40, shipping_cost: 12.5, missing_inputs: [], has_active_promo: true,
  origem: 'assistente', margin_pct: 18.4, profit_unit: 8, estimable: true,
  below_floor: true, base_margin_pct: 55, computed_at: '2026-09-22T10:00:00Z',
  candidates_count: 3, scheduled_count: 1,
  active_promo: {
    promotion_type: 'PRICE_DISCOUNT', promotion_name: 'Oferta do dia', promotion_id: 'P1',
    buyer_price: 70, discount_pct: 30,
    start_date: '2026-09-01T00:00:00Z', finish_date: null,
  },
  agent_last: { created_at: '2026-09-06T21:53:00Z', acao: 'aprofundar' },
  permalink: 'https://produto.mercadolivre.com.br/MLB-1',
};

const LINHA_OK = {
  ...LINHA,
  item_id: 'MLB2', title: 'Adubo 1kg', below_floor: false, has_active_promo: false,
  active_promo: null, discount_pct: null, buyer_price: null, margin_pct: 42,
  base_margin_pct: 42, profit_unit: 30, candidates_count: 0, scheduled_count: 0,
  health: 'alto', health_info: { units_per_week: 4 }, computed_at: '2026-09-22T09:00:00Z',
};

const PAYLOAD = {
  success: true, page: 1, page_size: 40, total: 2,
  accounts: [{ account_id: 'ACC1', account_nickname: 'MOGIVITTA' }],
  summary: { ads: 2, with_active_promo: 1, below_floor: 1 },
  snapshot: { computed_at: '2026-09-22T10:00:00Z', stale: false, empty: false },
  automation: null,
  results: [LINHA, LINHA_OK],
};

const DETALHE = {
  success: true,
  item: { item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', account_nickname: 'MOGIVITTA',
    status: 'active', price: 100, permalink: '#', sales_30d: 5, health: 'medio',
    health_info: { units_per_week: 1.2 } },
  promotions: { active: [], scheduled: [], candidates: [] },
  agent_logs: [],
};

const AUTOMACAO = {
  write_mode_global: true, kill_switch: false, next_cycle_at: '2026-09-23T12:00:00Z',
  by_account: {
    ACC1: { account_nickname: 'MOGIVITTA', auto_write: true, paused: false, canary_pending: false },
  },
};

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>', props: ['label'] },
  'q-input': { template: '<input />', props: ['modelValue'] },
  'q-select': { template: '<select />', props: ['modelValue'] },
  'q-toggle': { template: '<input type="checkbox" />', props: ['modelValue'] },
  'router-link': { template: '<a><slot /></a>' },
  'q-page': { template: '<div><slot /></div>' },
};

async function montar(payload = PAYLOAD, query = {}) {
  getCatalog.mockResolvedValue({ data: payload });
  getAutomation.mockResolvedValue({ data: AUTOMACAO });
  getItemDetail.mockResolvedValue({ data: DETALHE });
  routeMock.query = query;
  const wrapper = mount(AdvisorAnalysisPage, { global: { stubs } });
  await flushPromises();
  wrapper.texto = () => wrapper.element.textContent.replace(/\u00a0/g, ' ');
  return wrapper;
}

/** O debounce da busca é de 300 ms; esperar um pouco mais deixa a chamada sair. */
const aposDebounce = () => new Promise((resolve) => setTimeout(resolve, 360));

describe('AdvisorAnalysisPage', () => {
  beforeEach(() => {
    getCatalog.mockReset();
    getItemDetail.mockReset();
    getAutomation.mockReset();
    patchAutomation.mockReset();
    replace.mockReset();
  });

  it('mostra as colunas novas da análise: margem-base, última atualização e ofertadas', async () => {
    const texto = (await montar()).texto();
    const cabecalhos = (await montar()).findAll('.adv-table__table thead th').map((th) => th.text());
    expect(cabecalhos).toContain('Margem-base');
    expect(cabecalhos).toContain('Última atualização');
    expect(cabecalhos).toContain('Ofertadas (nº)');
    expect(texto).toContain('55,0%');    // margem-base
    expect(texto).toContain('18,4%');    // margem em promo
    expect(texto).toContain('Oferta do dia');
    expect(texto).toContain('22/09');    // última atualização
  });

  it('uma linha por anúncio — 2 anúncios, 2 linhas', async () => {
    const wrapper = await montar();
    expect(wrapper.findAll('.adv-table__table tbody tr')).toHaveLength(2);
  });

  it('chips contam por situação e recortam a tabela ao clicar', async () => {
    const wrapper = await montar();
    const chips = wrapper.findAll('.an__chip');
    expect(chips.length).toBeGreaterThan(0);
    // o rótulo vem do META (o PROMO-IA-46 troca o texto; o teste acompanha)
    const rotuloRuim = SITUATION_META.bloqueado_piso.label;
    expect(wrapper.texto()).toContain(rotuloRuim);

    const chipRuim = chips.find((c) => c.text().includes(rotuloRuim));
    await chipRuim.trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.adv-table__table tbody tr')).toHaveLength(1);
    expect(wrapper.texto()).toContain('Ureia 25kg');
    // clicar de novo volta a mostrar todos
    await chipRuim.trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.adv-table__table tbody tr')).toHaveLength(2);
  });

  it('clicar na linha abre o drawer com o detalhe ao vivo e registra ?item= na URL', async () => {
    const wrapper = await montar();
    await wrapper.findAll('.adv-table__table tbody tr')[0].trigger('click');
    await flushPromises();

    expect(getItemDetail).toHaveBeenCalledWith('MLB1');
    expect(wrapper.find('.adv-drawer').exists()).toBe(true);
    expect(replace).toHaveBeenCalledWith({ query: { item: 'MLB1' } });
  });

  it('deep-link ?item=MLB… abre o drawer sem clique', async () => {
    await montar(PAYLOAD, { item: 'MLB2' });
    expect(getItemDetail).toHaveBeenCalledWith('MLB2');
  });

  it('fechar o drawer limpa o item da URL', async () => {
    const wrapper = await montar();
    routeMock.query = { item: 'MLB1' };
    await wrapper.findAll('.adv-table__table tbody tr')[0].trigger('click');
    await flushPromises();

    await wrapper.find('.adv-drawer').find('button').trigger('click');
    await flushPromises();

    expect(replace).toHaveBeenLastCalledWith({ query: {} });
  });

  it('a barra de estado do robô aparece junto da tabela (kill/escrita/próxima execução)', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('Escrevendo agora: MOGIVITTA');
    expect(texto).toContain('próxima execução');
    expect(texto).toContain('Pausar toda a escrita');
  });

  it('a dupla mostra selo "Poucas vendas" e o drawer envia para revisão (PROMO-IA-47, portado)', async () => {
    const duplaRow = {
      ...LINHA, item_id: 'MLB3', health: 'parado', below_min: true,
      health_info: { units_per_week: 0 }, title: 'Perlita 5L',
    };
    const wrapper = await montar({ ...PAYLOAD, total: 1, results: [duplaRow] }, { item: 'MLB3' });
    expect(wrapper.texto()).toContain('Poucas vendas');

    enqueueForReview.mockResolvedValue({ data: { success: true, enqueued: [{ item_id: 'MLB3' }] } });
    const botao = wrapper.find('.adv-drawer').findAll('button')
      .find((b) => b.text().includes('Enviar para revisão'));
    expect(botao).toBeTruthy();
    await botao.trigger('click');
    await flushPromises();

    expect(enqueueForReview).toHaveBeenCalledWith({
      item_ids: ['MLB3'], reason: 'abaixo do mínimo + poucas vendas',
    });
    expect(wrapper.texto()).toContain('Anúncios · Revisão SEO');
  });

  it('o filtro "Abaixo do mínimo e poucas vendas" manda below_min + health=parado,fraco (PROMO-IA-47, portado)', async () => {
    const wrapper = await montar();
    getCatalog.mockClear();

    wrapper.vm.filtros.soDupla = true;
    await aposDebounce();
    await flushPromises();

    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({
      below_min: 'true', health: 'parado,fraco',
    }));
  });
});
