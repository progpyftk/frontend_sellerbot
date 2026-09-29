// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getToday = vi.fn();
const getCatalog = vi.fn();
vi.mock('src/services/AdvisorService', () => ({ default: { getToday: (...args) => getToday(...args), getCatalog: (...args) => getCatalog(...args) } }));
import AdvisorOverviewPage from 'src/pages/advisor/AdvisorOverviewPage.vue';

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>', props: ['label'] },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
  'router-link': { template: '<a><slot /></a>' },
  AdvisorShell: { template: '<div><slot name="actions" /><slot /></div>', props: ['active', 'pergunta'] },
};

describe('AdvisorOverviewPage', () => {
  beforeEach(() => {
    getToday.mockReset();
    getCatalog.mockReset();
    getCatalog.mockResolvedValue({ data: { summary: { ads: 10, with_active_promo: 3, scheduled_only: 2, without_active_or_scheduled_snapshot: 5 }, snapshot: { by_account: { A: { account_nickname: 'Loja A', computed_at: '2026-09-28T12:00:00Z', stale: false } } } } });
  });

  it('mostra execução registrada e unidades dos totais', async () => {
    getToday.mockResolvedValue({ data: {
      day_window: { timezone: 'America/Sao_Paulo' },
      last_cycle: { status: 'partial', finished_at: '2026-09-28T12:00:00Z', items_processed: 2 },
      by_account: { A: { today: { alterados: 2, ja_no_alvo: 1, aguardando_aval: 3 } } },
      recuperacao: { anuncios_em_recuperacao: 1, cadeias_em_recuperacao: 1, itens: [
        { job_id: 7, item_id: 'MLB-PENDENTE', account_nickname: 'Loja A', status: 'queued', etapa: 'verify', proxima_execucao: null },
      ] },
      failures: [],
    } });
    const wrapper = mount(AdvisorOverviewPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Concluída com pendências');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('Anúncios alterados e confirmados hoje');
    expect(wrapper.text()).toContain('Mantidos: já estavam no preço-alvo');
    expect(getCatalog).toHaveBeenCalledWith({ status: 'active', page_size: 1 });
    expect(wrapper.text()).toContain('Sem promoção ativa ou programada no retrato');
    expect(wrapper.text()).toContain('Loja A: coleta em');
    expect(wrapper.text()).toContain('MLB-PENDENTE');
    expect(wrapper.text()).toContain('sem próxima tentativa registrada');
  });

  it('não mostra totais como zero quando a agregação falha', async () => {
    getToday.mockResolvedValue({ data: { facts_error: true, by_account: {} } });
    const wrapper = mount(AdvisorOverviewPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('A agregação dos números falhou');
    expect(wrapper.text()).toContain('Os totais não estão disponíveis');
    expect(wrapper.find('[aria-label="Resumo do dia"]').exists()).toBe(false);
  });
});
