// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getActivity = vi.fn();
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }));
vi.mock('src/services/AdvisorService', () => ({ default: { getActivity: (...args) => getActivity(...args) } }));
import AdvisorActivityPage from 'src/pages/advisor/AdvisorActivityPage.vue';

const stubs = {
  AdvisorShell: { template: '<div><slot name="actions"/><slot/></div>', props: ['active', 'pergunta'] },
  AdvisorEmptyState: { template: '<div>{{ title }}{{ message }}<slot/></div>', props: ['title', 'message', 'variant'] },
  AdvisorStatusPill: { template: '<span><slot/></span>', props: ['status'] },
  'q-banner': { template: '<div><slot/><slot name="action"/></div>' },
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot/>{{ label }}</button>', props: ['label'] },
  'q-select': { template: '<select />', props: ['modelValue', 'options', 'label'] },
  'q-input': { template: '<input />', props: ['modelValue', 'label'] },
  'router-link': { template: '<a><slot/></a>' },
};

describe('AdvisorActivityPage', () => {
  beforeEach(() => getActivity.mockReset());

  it('mostra evento como confirmado e distingue preço de margem do registro', async () => {
    getActivity.mockResolvedValue({ data: {
      total: 1, scope: { accounts: [{ account_id: 'ACC1', account_nickname: 'Loja 1' }] },
      results: [{ account_id: 'ACC1', account_nickname: 'Loja 1', item_id: 'MLB1', title: 'Adubo', sku: 'A1',
        action_id: 'uuid', attempt_no: 2, attempt_count: 2, origin: 'automation', state: 'executed_verified', created_at: '2026-09-28T12:00:00Z',
        deal_price: '70.00', financial_gate: { margin_pct: '31.2', profit: '20.00' } }],
    } });
    const wrapper = mount(AdvisorActivityPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Adubo');
    expect(wrapper.text()).toContain('Confirmado');
    expect(wrapper.text()).toContain('no registro da tentativa');
    expect(wrapper.text()).toContain('1 decisão registrada');
    expect(wrapper.text()).toContain('Registros desta decisão2');
    expect(getActivity).toHaveBeenCalledWith(expect.objectContaining({ group: 'action' }));
  });

});
