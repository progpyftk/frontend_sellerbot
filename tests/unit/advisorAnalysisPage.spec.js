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
  below_floor: true, below_min: true, base_margin_pct: 55, computed_at: '2026-09-22T10:00:00Z',
  candidates_count: 3, scheduled_count: 1,
  available_quantity: 12, sold_quantity: 5,
  last_result: { state: 'executed_verified', at: '2026-09-06T21:53:00Z', blocked_code: null },
  floor_margin_pct: 30, floor_profit_brl: 20,
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
  'q-toggle': {
    template: '<label><input type="checkbox" :title="title" />{{ label }}</label>',
    props: ['modelValue', 'label', 'title'],
  },
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

  it('o pipeline do dono vira coluna: Classificação · Situação · Decisão · Resultado (PROMO-IA-48)', async () => {
    const wrapper = await montar();
    const cabecalhos = wrapper.findAll('.adv-table__table thead th').map((th) => th.text());
    expect(cabecalhos).toContain('Classificação');
    expect(cabecalhos).toContain('Situação da venda');
    expect(cabecalhos).toContain('Decisão do agente');
    expect(cabecalhos).toContain('Resultado');
    expect(cabecalhos).toContain('Estoque');
    // PROMO-IA-49: Status virou badge no título e o SKU foi para a linha de apoio
    // (colunas próprias saíram para a tabela caber na tela)
    expect(wrapper.texto()).toContain('Ativo');
    expect(wrapper.texto()).toContain('U-25');
    expect(cabecalhos).not.toContain('Status');
    expect(cabecalhos).not.toContain('SKU');
    // "Análises 40" sumiu — título novo + contagem como meta à direita
    expect(wrapper.texto()).toContain('Análises realizadas pelo agente');
    expect(wrapper.texto()).toContain('2 nesta página · 2 no catálogo');
    // classificação = UMA coisa (saúde) + a data compacta
    expect(wrapper.texto()).toContain('Médio');
    expect(wrapper.texto()).toContain('23/09');
    // vocabulário autoexplicativo do mínimo
    expect(wrapper.texto()).toContain('Só abaixo do mínimo de margem ou lucro');
  });

  it('a coluna Resultado mostra o desfecho real da última escrita (PROMO-IA-48)', async () => {
    const recusado = {
      ...LINHA, item_id: 'MLB2', title: 'Adubo 1kg',
      last_result: { state: 'failed', at: null, blocked_code: 'WRITE_REJECTED' },
    };
    const semEscrita = { ...LINHA, item_id: 'MLB3', title: 'Perlita 5L', last_result: null };
    const wrapper = await montar({ ...PAYLOAD, total: 3, results: [LINHA, recusado, semEscrita] });
    const texto = wrapper.texto();
    expect(texto).toContain('Confirmado');   // executed_verified
    expect(texto).toContain('Recusado');     // failed
  });

  it('estoque zerado fica vermelho e o tooltip mostra os vendidos (PROMO-IA-48)', async () => {
    const zerado = { ...LINHA, available_quantity: 0, sold_quantity: 9 };
    const wrapper = await montar({ ...PAYLOAD, total: 1, results: [zerado] });
    expect(wrapper.find('[title="Vendidos: 9"]').exists()).toBe(true);
    expect(wrapper.find('.an__ruim').exists()).toBe(true);
  });

  it('a dupla decide preço E revisão e a Situação traz os mínimos da CONTA (PROMO-IA-48)', async () => {
    const duplaRow = {
      ...LINHA, item_id: 'MLB3', title: 'Perlita 5L', health: 'parado',
      health_info: { units_per_week: 0 }, margin_pct: 10, profit_unit: 4,
      below_floor: true, below_min: true, floor_margin_pct: 25, floor_profit_brl: 15,
    };
    const wrapper = await montar({ ...PAYLOAD, total: 1, results: [duplaRow] }, { item: 'MLB3' });
    const texto = wrapper.texto();
    // decisão desmascarada em rótulo curto (PROMO-IA-49) — o texto completo vai no tooltip
    expect(texto).toContain('Preço + revisão');
    // os mínimos são os da CONTA da linha, em formato compacto
    expect(texto).toContain('mín. 25% · R$ 15');

    // o botão do drawer segue portando o encaminhamento à fila de revisão
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

  it('clique no cabeçalho ordenável refaz o pedido com sort (PROMO-IA-48)', async () => {
    // regressão: o clique vive na CÉLULA do cabeçalho (o dono reportou que as ordenações
    // "não funcionavam" — o handler antigo só pegava o clique exato no rótulo do botão).
    const wrapper = await montar();
    getCatalog.mockClear();

    const thPreco = wrapper.findAll('.adv-table__table thead th')
      .find((th) => th.text().includes('Preço-base'));
    expect(thPreco, 'cabeçalho de Preço-base deveria existir').toBeTruthy();
    await thPreco.trigger('click');
    await aposDebounce();
    await flushPromises();

    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price', page: 1 }));

    getCatalog.mockClear();
    await thPreco.trigger('click');
    await aposDebounce();
    await flushPromises();
    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({ sort: '-price' }));

    // o clique no botão interno também ordena (sem duplo emit)
    getCatalog.mockClear();
    await thPreco.find('button.adv-table__sort').trigger('click');
    await aposDebounce();
    await flushPromises();
    expect(getCatalog).toHaveBeenCalledTimes(1);
  });

  it('a barra de estado do robô aparece junto da tabela (kill/escrita/próxima execução)', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('Escrevendo agora: MOGIVITTA');
    expect(texto).toContain('próxima execução');
    expect(texto).toContain('Pausar toda a escrita');
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
