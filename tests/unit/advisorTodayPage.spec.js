// @vitest-environment jsdom
/**
 * Testes da superfície "Hoje" (PROMO-IA-22 · F0+F1).
 *
 * O que protegem:
 * - a resposta à pergunta central aparece primeiro (proteção + métricas), com unidade e contexto;
 * - "não mexeu (avaliados)" não soma contas com escrita desligada;
 * - cada anúncio alterado é UMA linha, com antes → depois, estado e hora;
 * - o botão de emergência chama o PATCH `pause_all` e recarrega;
 * - erro tem estado próprio (não parece lista vazia).
 */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getToday = vi.fn();
const patchAutomation = vi.fn();

vi.mock('src/services/AdvisorService', () => ({
  default: {
    getToday: (...a) => getToday(...a),
    patchAutomation: (...a) => patchAutomation(...a),
  },
}));

import AdvisorTodayPage from 'src/pages/advisor/AdvisorTodayPage.vue';

const PAYLOAD = {
  write_mode_global: true,
  kill_switch: false,
  day_window: { start: '2026-09-11T03:00:00Z', end: '2026-09-12T03:00:00Z', timezone: 'America/Sao_Paulo' },
  cycle_today: true,
  next_cycle_at: '2026-09-12T12:00:00Z',
  last_cycle: {
    started_at: '2026-09-11T12:00:00Z', status: 'partial', duration_seconds: 513,
    items_processed: 3, errors_count: 0, reconciled: 23, unreconciled: 2,
  },
  by_account: {
    ACC1: {
      account_nickname: 'MOGIVITTA', auto_write: true, wave_size: 10, paused: false,
      canary_pending: true, margin_alerts: [],
      today: {
        alterados: 3, ja_no_alvo: 17, nao_confirmados: 1, recusados: 0, bloqueados: 217,
        no_plano: 106, anuncios_ativos: 406, aguardando_aval: 17, sem_dado_de_custo: 12,
        motivos: {
          SMART_READ_ONLY: { label: 'o preço é do Mercado Livre (SMART)', anuncios: 96 },
          WRITE_DISABLED: { label: 'estão em conta com a escrita desligada', anuncios: 121 },
        },
      },
      protection: { aplicadas: 3, abaixo_do_piso: 0, menor_margem_pct: 30.2, menor_lucro_brl: 12.32, ultima_escrita_at: '2026-09-11T13:36:00Z' },
      last_writes: [
        { item_id: 'MLB1', title: 'Basacote 12m', price_before: '47.00', price_after: '39.00',
          margin_pct: '31.3', profit_unit: '12.19', state: 'executed_verified', origin: 'automation',
          at: '2026-09-11T12:05:00Z' },
        { item_id: 'MLB2', title: 'Quelato de Ferro', price_before: null, price_after: '139.00',
          margin_pct: '30.3', profit_unit: '42.07', state: 'executed_verified', origin: 'reconcile',
          at: '2026-09-11T13:36:00Z' },
      ],
    },
  },
};

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>', props: ['label'] },
  'router-link': { template: '<a><slot /></a>' },
  'q-page': { template: '<div><slot /></div>' },
};

async function montar(payload = PAYLOAD) {
  getToday.mockResolvedValue({ data: payload });
  const wrapper = mount(AdvisorTodayPage, { global: { stubs } });
  await flushPromises();
  wrapper.text = () => wrapper.element.textContent.replace(/\u00a0/g, ' ');
  return wrapper;
}

describe('AdvisorTodayPage', () => {
  beforeEach(() => {
    getToday.mockReset();
    patchAutomation.mockReset();
    patchAutomation.mockResolvedValue({ data: { success: true } });
  });

  it('mostra a navegação por superfície com Hoje ativo', async () => {
    const texto = (await montar()).text();
    expect(texto).toContain('Hoje');
    expect(texto).toContain('Anúncios');
    expect(texto).toContain('Automação');
  });

  it('responde primeiro se algo saiu do piso, com margem e lucro mínimos', async () => {
    const texto = (await montar()).text();
    expect(texto).toContain('Nenhum preço saiu abaixo do piso');
    expect(texto).toContain('30,2%');
    expect(texto).toContain('R$ 12,32');
  });

  it('traz as métricas do dia com unidade e contexto', async () => {
    const texto = (await montar()).text();
    expect(texto).toContain('anúncios alterados hoje');
    expect(texto).toContain('já estavam no preço-alvo');
    expect(texto).toContain('aguardando confirmação do ML');
    expect(texto).toContain('MOGIVITTA · leva de 10');
  });

  it('não soma contas com escrita desligada em "não mexeu"', async () => {
    const texto = (await montar()).text();
    // 217 bloqueados = 96 de proteção (SMART) + 121 de conta desligada.
    // "não mexeu (avaliados)" = 17 (já no alvo) + 96 (proteção) = 113 — os 121 não contam.
    expect(texto).toContain('113');
    expect(texto).toContain('não mexeu (avaliados)');
    expect(texto).toContain('121');
    expect(texto).toContain('nem foram avaliados');
    expect(texto).not.toContain('não mexeu no preço de 217');
  });

  it('lista cada anúncio uma vez com antes → depois e o estado', async () => {
    const texto = (await montar()).text();
    expect(texto).toContain('MLB1');
    expect(texto).toContain('R$ 47,00');
    expect(texto).toContain('R$ 39,00');
    expect(texto).toContain('confirmado depois');   // origem reconcile
  });

  it('mostra o ciclo e sinaliza não confirmados', async () => {
    const texto = (await montar()).text();
    expect(texto).toContain('2 aguardando confirmação');
    expect(texto).toContain('parcial');
    // `items_processed` é o que PASSOU pelo ciclo, não o que foi alterado: chamar de
    // "alterado(s)" criava dois números diferentes para a mesma ideia na mesma tela.
    // `items_processed` é a soma das ESCRITAS CONFIRMADAS no ciclo (views/promotions.py:210),
    // não "anúncios processados" nem "alterados".
    expect(texto).toContain('3 escrita(s) confirmada(s) pelo Mercado Livre');
    expect(texto).not.toContain('alterado(s)');
  });

  it('nunca dá paz com dado vazio: sem conta avaliada o escudo avisa', async () => {
    // Resposta sem nenhuma conta no ciclo (conta não conectada, backend antigo, universo vazio):
    // o banner NÃO pode dizer "nenhum preço saiu abaixo do piso", porque nada foi lido.
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account = {};

    const texto = (await montar(payload)).text();
    expect(texto).toContain('Nenhum anúncio foi avaliado hoje');
    expect(texto).toContain('Nenhuma conta do Mercado Livre entrou no ciclo de hoje');
    expect(texto).not.toContain('Nenhum preço saiu abaixo do piso');
    expect(texto).not.toContain('Pausar toda a escrita');   // sem conta, não há o que pausar
  });

  it('não afirma segurança quando a agregação do dia falhou', async () => {
    // Achado P0-2: erro de agregação zerava os baldes e a tela mostrava escudo verde.
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.facts_error = true;
    payload.by_account.ACC1.today = { alterados: 0, ja_no_alvo: 0, nao_confirmados: 0, recusados: 0, bloqueados: 0, motivos: {} };
    payload.by_account.ACC1.last_writes = [];
    payload.by_account.ACC1.protection = { aplicadas: 0, abaixo_do_piso: 0, menor_margem_pct: null, menor_lucro_brl: null, ultima_escrita_at: null };

    const texto = (await montar(payload)).text();
    expect(texto).toContain('Não foi possível ler o trabalho de hoje');
    expect(texto).toContain('NÃO são confiáveis');
    expect(texto).not.toContain('Nenhum preço saiu abaixo do piso');
  });

  it('sem escrita hoje não atesta proteção (nada foi aplicado)', async () => {
    // Achado P0-1: conta conectada mas sem nenhum anúncio escrito não pode render "tudo seguro".
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC1.today = { alterados: 0, ja_no_alvo: 0, nao_confirmados: 0, recusados: 0, bloqueados: 0, motivos: {} };
    payload.by_account.ACC1.last_writes = [];
    payload.by_account.ACC1.protection = { aplicadas: 0, abaixo_do_piso: 0, menor_margem_pct: null, menor_lucro_brl: null, ultima_escrita_at: null };

    const texto = (await montar(payload)).text();
    expect(texto).toContain('Nenhum preço foi alterado hoje');
    expect(texto).toContain('sem escrita hoje, não há preço para proteger');
    expect(texto).not.toContain('Nenhum preço saiu abaixo do piso');
  });

  it('mostra o kill switch ligado, mesmo com conta autorizada', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.kill_switch = true;

    const texto = (await montar(payload)).text();
    expect(texto).toContain('interruptor de emergência');
    // com o kill switch ligado o robô NÃO está autorizado: o card não pode anunciar a conta ativa
    expect(texto).toContain('nenhuma conta ligada');
    expect(texto).not.toContain('MOGIVITTA · leva de 10');
  });

  it('não mostra o ciclo de ontem como se fosse o de hoje', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.cycle_today = false;   // o ciclo de hoje morreu no timeout e não deixou registro

    const texto = (await montar(payload)).text();
    expect(texto).toContain('O ciclo de hoje não deixou registro');
    // o registro de ontem é citado como histórico, nunca como o ciclo de hoje
    expect(texto).toContain('A última execução registrada foi em');
    expect(texto).not.toContain('escrita(s) confirmada(s) pelo Mercado Livre');
  });

  it('não soma o plano de contas que não escrevem', async () => {
    // Conta desligada também tem plano do dia; somá-la faria o rodapé anunciar trabalho que não
    // vai acontecer. O total agora é escopado e a contagem de contas ativas aparece ao lado.
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC2 = {
      account_nickname: 'AGF_ORGANICS', auto_write: false, wave_size: 50, paused: false,
      canary_pending: false, margin_alerts: [],
      today: { alterados: 0, ja_no_alvo: 0, nao_confirmados: 0, recusados: 0, bloqueados: 43,
               no_plano: 43, anuncios_ativos: 50, aguardando_aval: 0,
               motivos: { WRITE_DISABLED: { label: 'estão em conta com a escrita desligada', anuncios: 43 } } },
      protection: { aplicadas: 0, abaixo_do_piso: 0, menor_margem_pct: null, menor_lucro_brl: null, ultima_escrita_at: null },
      last_writes: [],
    };

    const texto = (await montar(payload)).text();
    expect(texto).toContain('2 contas (1 escrevendo)');
    expect(texto).toContain('106 entraram no plano do dia nas contas que escrevem');
  });

  it('sobe o erro do ciclo para perto do escudo', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.last_cycle.errors_count = 4;

    const texto = (await montar(payload)).text();
    expect(texto).toContain('O ciclo de hoje terminou com 4 erro(s)');
  });

  it('aprova a conta que tem anúncios no portão, não a que só tem canário pendente', async () => {
    // Regressão de produção 11/09: AGF nasce com `canary_pending` (conta nova) mas escrita
    // desligada e zero anúncios no portão; a MOGIVITTA é quem tem 17 parados. Gatear por
    // `canary_pending` escondia o botão de quem precisava dele.
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC2 = {
      account_nickname: 'AGF_ORGANICS', auto_write: false, wave_size: 50, paused: false,
      canary_pending: true, margin_alerts: [],
      today: { alterados: 0, ja_no_alvo: 0, nao_confirmados: 0, recusados: 0, bloqueados: 43,
               no_plano: 43, anuncios_ativos: 50, aguardando_aval: 0,
               motivos: { WRITE_DISABLED: { label: 'estão em conta com a escrita desligada', anuncios: 43 } } },
      protection: { aplicadas: 0, abaixo_do_piso: 0, menor_margem_pct: null, menor_lucro_brl: null, ultima_escrita_at: null },
      last_writes: [],
    };

    const wrapper = await montar(payload);
    expect(wrapper.text()).toContain('Esperando você');
    expect(wrapper.text()).toContain('da conta MOGIVITTA');
    expect(wrapper.text()).toContain('leva de 10');

    await wrapper.vm.aprovarLeva();
    expect(patchAutomation).toHaveBeenCalledWith({ account_id: 'ACC1', canary_approved: true });
  });

  it('conta em modo canário sem anúncio no portão ainda mostra o aval', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC1.today.aguardando_aval = 0;

    const texto = (await montar(payload)).text();
    expect(texto).toContain('Esperando você');
    expect(texto).toContain('está em modo de primeira leva (canário) esperando o seu aval');
  });

  it('avisa quando a lista de alterados está truncada', async () => {
    // A métrica conta 25 alterações, mas a lista mostra no máximo 10 (as mais recentes).
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC1.today.alterados = 25;

    const texto = (await montar(payload)).text();
    expect(texto).toContain('Exibindo 2 de 25 alterações de hoje');
  });

  it('não avisa truncamento quando a lista mostra tudo', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC1.today.alterados = 2;   // as 2 escritas estão todas na lista
    const texto = (await montar(payload)).text();
    expect(texto).not.toContain('mais recentes de');
  });

  it('pausa toda a escrita com um clique depois da confirmação', async () => {
    const wrapper = await montar();
    wrapper.vm.confirmarPausa = true;
    await wrapper.vm.pausarTudo();
    expect(patchAutomation).toHaveBeenCalledWith({ pause_all: true });
    expect(getToday).toHaveBeenCalledTimes(2);   // recarrega depois de pausar
  });

  it('não aprova conta errada quando nenhuma tem canário pendente', async () => {
    // Sem conta pendente o botão nem aparece e a chamada não acontece: aprovar no palpite
    // (`contas[0]`) escreveria preço na conta errada, ou daria aval falso ao dono.
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC1.today.aguardando_aval = 0;   // nada parado no portão…
    payload.by_account.ACC1.canary_pending = false;      // …e a conta não está em modo canário

    const wrapper = await montar(payload);
    expect(wrapper.text()).not.toContain('Esperando você');

    await wrapper.vm.aprovarLeva();
    expect(patchAutomation).not.toHaveBeenCalled();
  });

  it('aprovar a leva usa a conta com canário pendente', async () => {
    const wrapper = await montar();
    await wrapper.vm.aprovarLeva();
    expect(patchAutomation).toHaveBeenCalledWith({ account_id: 'ACC1', canary_approved: true });
  });

  it('erro tem estado próprio e nunca parece lista vazia', async () => {
    getToday.mockRejectedValue(new Error('boom'));
    const wrapper = mount(AdvisorTodayPage, { global: { stubs } });
    await flushPromises();
    const texto = wrapper.element.textContent;
    expect(texto).toContain('Tentar novamente');
    expect(texto).not.toContain('Nenhum anúncio alterado');
  });
});
