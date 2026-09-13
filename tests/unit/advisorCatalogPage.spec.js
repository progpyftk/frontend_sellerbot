// @vitest-environment jsdom
/**
 * Testes da superfície "Anúncios" (PROMO-IA-22 · F2).
 *
 * O que protegem:
 * - o pedido à API sai com os parâmetros certos (paginação, ordem e preset padrão);
 * - mudar filtro volta para a página 1 e manda o parâmetro traduzido (`below_floor`, `has_promo`);
 * - a busca não dispara a cada tecla (debounce) — são 753 anúncios em produção;
 * - a tabela e o cartão do celular mostram o MESMO dado (antes → depois por linha);
 * - `agent_last` é um objeto `{created_at, acao}`: passar o objeto cru para `new Date` derrubava a
 *   superfície inteira (regressão real de 11/09/2026);
 * - erro tem estado próprio e não parece lista vazia.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCatalog = vi.fn();

vi.mock('src/services/AdvisorService', () => ({
  default: { getCatalog: (...a) => getCatalog(...a) },
}));

import AdvisorCatalogPage from 'src/pages/advisor/AdvisorCatalogPage.vue';

const PAYLOAD = {
  success: true,
  page: 1,
  page_size: 40,
  total: 753,
  accounts: [{ account_id: 'ACC1', account_nickname: 'MOGIVITTA' }],
  summary: { ads: 753, with_active_promo: 512, below_floor: 56, assistente: 56, agent_history: 83 },
  snapshot: { computed_at: '2026-09-11T23:22:20Z', stale: false, empty: false },
  automation: null,
  results: [
    {
      account_id: 'ACC1', account_nickname: 'MOGIVITTA',
      item_id: 'MLB1', title: 'Ureia 25kg', sku: 'U-25', status: 'active',
      price: 100, buyer_price: 70, discount_pct: 30, sales_30d: 5,
      health: 'medio', cmv_unit: 40, missing_inputs: [], has_active_promo: true,
      origem: 'assistente', margin_pct: 18.4, profit_unit: 8, estimable: true, below_floor: true,
      agent_last: { created_at: '2026-09-06T21:53:00Z', acao: 'aprofundar' },
      permalink: 'https://produto.mercadolivre.com.br/MLB-1',
    },
    {
      account_id: 'ACC1', account_nickname: 'MOGIVITTA',
      item_id: 'MLB2', title: 'Adubo 1kg', sku: 'A-1', status: 'active',
      price: 50, buyer_price: null, discount_pct: null, sales_30d: 0,
      health: 'parado', cmv_unit: 20, missing_inputs: ['shipping'], has_active_promo: false,
      origem: null, margin_pct: null, profit_unit: null, estimable: false, below_floor: false,
      agent_last: null, permalink: 'https://produto.mercadolivre.com.br/MLB-2',
    },
  ],
};

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>', props: ['label'] },
  'q-input': { template: '<input />', props: ['modelValue'] },
  'q-select': { template: '<select />', props: ['modelValue'] },
  'q-toggle': { template: '<input type="checkbox" />', props: ['modelValue'] },
  'q-btn-toggle': { template: '<div><slot /></div>', props: ['modelValue'] },
  'router-link': { template: '<a><slot /></a>' },
  'q-page': { template: '<div><slot /></div>' },
};

async function montar(payload = PAYLOAD) {
  getCatalog.mockResolvedValue({ data: payload });
  const wrapper = mount(AdvisorCatalogPage, { global: { stubs } });
  await flushPromises();
  wrapper.texto = () => wrapper.element.textContent.replace(/\u00a0/g, ' ');
  return wrapper;
}

/** O debounce da busca é de 300 ms; esperar um pouco mais deixa a chamada sair. */
const aposDebounce = () => new Promise((resolve) => setTimeout(resolve, 360));

describe('AdvisorCatalogPage', () => {
  beforeEach(() => {
    getCatalog.mockReset();
  });

  it('pede a página padrão com ordem e preset default', async () => {
    await montar();
    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({
      page: 1, page_size: 40, sort: '-sales', preset: 'assistente',
    }));
  });

  it('mostra os números do catálogo inteiro, não da página', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('anúncios no catálogo');
    expect(texto).toContain('753');
    expect(texto).toContain('abaixo do piso');
    expect(texto).toContain('56');
    expect(texto).toContain('com promoção ativa');
    expect(texto).toContain('512');
  });

  it('mostra o anúncio com margem, lucro e o estado explicado', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('Ureia 25kg');
    expect(texto).toContain('R$ 100,00');
    expect(texto).toContain('18,4%');
    expect(texto).toContain('Bloqueado: piso');
  });

  it('traduz a última ação do robô (agent_last é objeto, não data)', async () => {
    // Regressão: `new Date({created_at, acao})` lançava RangeError e apagava a página.
    const texto = (await montar()).texto();
    expect(texto).toContain('aprofunda em 06/09');
    expect(texto).toContain('nunca');   // o anúncio sem histórico diz "nunca"
  });

  it('filtro volta para a página 1 e vira parâmetro da API', async () => {
    const wrapper = await montar();
    getCatalog.mockClear();

    wrapper.vm.pagina = 3;
    await flushPromises();
    getCatalog.mockClear();

    wrapper.vm.filtros.soAbaixoDoPiso = true;
    await aposDebounce();
    await flushPromises();

    expect(getCatalog).toHaveBeenCalledTimes(1);
    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({ page: 1, below_floor: 'true' }));
  });

  it('ordena por outra coluna e manda a ordem para a API', async () => {
    const wrapper = await montar();
    getCatalog.mockClear();

    wrapper.vm.ordenarPor({ key: 'margem', sortable: true, sortKey: 'margin' });
    await aposDebounce();
    await flushPromises();

    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({ sort: 'margin', page: 1 }));
  });

  it('não dispara uma chamada por tecla na busca (debounce)', async () => {
    const wrapper = await montar();
    getCatalog.mockClear();

    wrapper.vm.filtros.q = 'u';
    wrapper.vm.filtros.q = 'ur';
    wrapper.vm.filtros.q = 'ure';
    await aposDebounce();
    await flushPromises();

    expect(getCatalog).toHaveBeenCalledTimes(1);
    expect(getCatalog).toHaveBeenCalledWith(expect.objectContaining({ q: 'ure' }));
  });

  it('tem tabela e cartão no DOM (celular não rola para o lado)', async () => {
    const wrapper = await montar();
    expect(wrapper.find('.adv-table__table').exists()).toBe(true);
    expect(wrapper.findAll('.adv-table__cards li')).toHaveLength(2);
  });

  it('drill-down mostra a linha inteira sem sair da página', async () => {
    const wrapper = await montar();
    await wrapper.findAll('.adv-table__table tbody tr')[0].trigger('click');
    await flushPromises();

    const detalhe = wrapper.find('.cat__detalhe');
    expect(detalhe.exists()).toBe(true);
    expect(detalhe.text()).toContain('Lucro por venda');
    expect(detalhe.text()).toContain('Última ação do robô');
    expect(detalhe.text()).toContain('U-25');
  });

  it('o preset "Completo" traz as colunas financeiras', async () => {
    // A legenda (sempre visível) cita "CMV" e "Saúde" em prosa, então a checagem é nos
    // CABEÇALHOS da tabela — que é o que o preset realmente governa.
    const cabecalhos = (w) => w.findAll('.adv-table__table thead th').map((th) => th.text());

    const wrapper = await montar();
    expect(cabecalhos(wrapper)).not.toContain('CMV');

    wrapper.vm.preset = 'completo';
    await flushPromises();
    expect(cabecalhos(wrapper)).toContain('CMV');
    expect(cabecalhos(wrapper)).toContain('Saúde');
  });

  it('explica cada rótulo da tabela com a regra', async () => {
    // "Bloqueado: piso" e "Baixo giro" não dizem nada a quem não escreveu a régua.
    const texto = (await montar()).texto();
    expect(texto).toContain('O que significa cada rótulo');
    expect(texto).toContain('Bloqueado: piso');
    expect(texto).toContain('margem abaixo de 30% ou o lucro abaixo de R$ 20');
    expect(texto).toContain('Giro baixo');   // rotulo vigente da situacao
    expect(texto).toContain('revisar o anúncio (SEO, completude e fotos)');
    expect(texto).toContain('Sem ação');
    expect(texto).toContain('Alvo do giro médio');
  });

  it('erro tem estado próprio e não parece lista vazia', async () => {
    getCatalog.mockRejectedValue({ response: { data: { detail: 'Servidor indisponível' } } });
    const wrapper = mount(AdvisorCatalogPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Servidor indisponível');
    expect(wrapper.text()).toContain('Tentar novamente');
    expect(wrapper.find('.adv-table__table').exists()).toBe(false);
    expect(wrapper.find('.adv-metric').exists()).toBe(false);
  });

  it('vazio com filtro não parece catálogo vazio', async () => {
    const wrapper = await montar({ ...PAYLOAD, results: [], total: 0 });
    wrapper.vm.filtros.soAbaixoDoPiso = true;
    await aposDebounce();
    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum anúncio com esse recorte');
    expect(wrapper.text()).toContain('o catálogo continua o mesmo');
  });
});
