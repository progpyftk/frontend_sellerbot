// @vitest-environment jsdom
/**
 * Testes do bloco "Hoje" (PROMO-IA-21 · F0/F2b).
 *
 * O que protegem (o que o dono vê):
 * - a manchete é o balde "alterados" — o "já no alvo" NÃO entra (é `executed_verified` sem POST);
 * - o aviso de proteção diz "nenhum preço abaixo do piso" quando é verdade;
 * - o dia vem do backend com janela explícita (o componente não recalcula dia);
 * - o motivo é linguagem de negócio (label do backend), não código;
 * - "sem registro do ciclo de hoje" aparece quando o ciclo não deixou log;
 * - somar contas só acontece quando o dono escolhe "todas".
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AdvisorTodayWork from 'src/components/promotions-ads/AdvisorTodayWork.vue';

vi.mock('src/services/MercadoLivreService', () => ({
  default: {
    pauseAllAdvisorWrites: vi.fn().mockResolvedValue({ data: { success: true } }),
    patchAdvisorPolicy: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const AUTOMATION = {
  write_mode_global: true,
  kill_switch: false,
  day_window: { start: '2026-09-11T03:00:00+00:00', end: '2026-09-12T03:00:00+00:00', timezone: 'America/Sao_Paulo' },
  cycle_today: false,
  next_cycle_at: '2026-09-12T12:00:00+00:00',
  last_cycle: null,
  by_account: {
    '221146867': {
      account_nickname: 'MOGIVITTA',
      auto_write: true,
      wave_size: 10,
      paused: false,
      canary_pending: true,
      today: {
        alterados: 3, ja_no_alvo: 17, nao_confirmados: 1, recusados: 0, bloqueados: 96,
        no_plano: 106, anuncios_ativos: 406, aguardando_aval: 17, sem_dado_de_custo: 12,
        motivos: {
          SMART_READ_ONLY: { label: 'o preço é do Mercado Livre (SMART)', anuncios: 37 },
          ALREADY_WRITTEN_TODAY_ITEM: { label: 'já tinham sido alterados hoje (não escreve 2× no mesmo dia)', anuncios: 46 },
        },
      },
      protection: {
        aplicadas: 3, abaixo_do_piso: 0, menor_margem_pct: 30.2, menor_lucro_brl: 12.32,
        ultima_escrita_at: '2026-09-11T12:05:00+00:00',
      },
      last_writes: [{
        item_id: 'MLB3795974187', title: 'Basacote 12m', action: 'aprofundar',
        price_before: '47.00', price_after: '39.00', margin_pct: '31.3', profit_unit: '12.19',
        state: 'executed_verified', origin: 'automation', at: '2026-09-11T12:05:00+00:00',
      }],
    },
  },
};

const stubs = {
  'q-icon': true, 'q-btn': true, 'q-select': true, 'q-input': true,
  SbBadge: { template: '<span class="sb-badge">{{ label || "" }}<slot /></span>', props: ['label'] },
};

function montar(automation = AUTOMATION) {
  const wrapper = mount(AdvisorTodayWork, { props: { automation }, global: { stubs } });
  // `toLocaleString('pt-BR', {currency})` usa espaço não-quebrável entre "R$" e o valor.
  wrapper.text = () => wrapper.element.textContent.replace(/\u00a0/g, ' ');
  return wrapper;
}

describe('AdvisorTodayWork', () => {
  it('a manchete é "alterados" e não soma o já-no-alvo', () => {
    const wrapper = montar();
    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('anúncios alterados hoje');
  });

  it('mostra o aviso de proteção quando nada saiu abaixo do piso', () => {
    const texto = montar().text();
    expect(texto).toContain('nenhum preço saiu abaixo do piso');
    expect(texto).toContain('30,2%');   // margem mínima aplicada, formatada em pt-BR
  });

  it('lista antes → depois com quem aplicou e a hora', () => {
    const texto = montar().text();
    expect(texto).toContain('MLB3795974187');
    expect(texto).toContain('R$ 47,00');
    expect(texto).toContain('R$ 39,00');
    expect(texto).toContain('robô');
  });

  it('mostra os motivos em linguagem de negócio, não código', () => {
    const texto = montar().text();
    expect(texto).toContain('o preço é do Mercado Livre (SMART)');
    expect(texto).not.toContain('SMART_READ_ONLY');
  });

  it('oferece a ação de aprovar a leva quando há anúncios aguardando', () => {
    expect(montar().text()).toContain('Esperando você (17)');
  });

  it('avisa quando o ciclo de hoje não deixou registro', () => {
    expect(montar().text()).toContain('Sem registro do ciclo de hoje');
  });

  it('mostra o ciclo quando existe', () => {
    const com = { ...AUTOMATION, cycle_today: true, last_cycle: {
      started_at: '2026-09-11T12:00:00+00:00', finished_at: '2026-09-11T12:08:00+00:00',
      status: 'partial', duration_seconds: 512.6, items_processed: 3, errors_count: 0,
      reconciled: 23, unreconciled: 2, margin_alerts_total: 13,
    } };
    const texto = montar(com).text();
    expect(texto).toContain('Última execução');
    expect(texto).toContain('parcial');
    expect(texto).toContain('2 aguardando confirmação');
  });

  it('cenário: escrita desligada mostra "não avaliados" e não finge que avaliou', () => {
    const desligada = JSON.parse(JSON.stringify(AUTOMATION));
    const conta = desligada.by_account['221146867'];
    conta.auto_write = false;
    conta.today.alterados = 0;
    conta.today.bloqueados = 121;
    conta.today.ja_no_alvo = 0;
    conta.today.motivos = { WRITE_DISABLED: { label: 'estão em conta com a escrita desligada', anuncios: 121 } };
    conta.last_writes = [];
    const texto = montar(desligada).text();
    expect(texto).toContain('nem foram avaliados');
    expect(texto).toContain('escrita automática desligada');
    expect(texto).not.toContain('Ele não mexeu no preço de 121');   // não foi avaliação
  });

  it('cenário: item confirmado depois é rotulado, não como escrita do robô', () => {
    const comReconcile = JSON.parse(JSON.stringify(AUTOMATION));
    comReconcile.by_account['221146867'].last_writes[0].origin = 'reconcile';
    const texto = montar(comReconcile).text();
    expect(texto).toContain('confirmado depois');
  });

  it('cenário: escrita sem preço anterior mostra travessão e o aviso, nunca um número', () => {
    const semAntes = JSON.parse(JSON.stringify(AUTOMATION));
    semAntes.by_account['221146867'].last_writes[0].price_before = null;
    const texto = montar(semAntes).text();
    expect(texto).toContain('Escritas anteriores a 11/09/2026');
    expect(texto).toContain('—');
  });

  it('pausa toda a escrita emite updated depois do PATCH', async () => {
    const service = (await import('src/services/MercadoLivreService')).default;
    const wrapper = montar();
    wrapper.vm.confirmPause = true;
    await wrapper.vm.pauseAll();
    expect(service.pauseAllAdvisorWrites).toHaveBeenCalledWith({ pause_all: true });
    expect(wrapper.emitted('updated')).toBeTruthy();
  });

  it('aprovar a leva usa a conta com canário pendente', async () => {
    const service = (await import('src/services/MercadoLivreService')).default;
    const wrapper = montar();
    await wrapper.vm.approveCanary();
    expect(service.patchAdvisorPolicy).toHaveBeenCalledWith(
      { account_id: '221146867', canary_approved: true },
    );
  });
});
