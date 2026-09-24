// @vitest-environment jsdom
/**
 * Editor da régua de limites por conta (PROMO-IA-56).
 *
 * O que protege:
 * - cada campo diz se é "sua conta" (override) ou "padrão da plataforma";
 * - "Restaurar padrão" limpa o rascunho e grava `null` (backend volta ao default);
 * - blur em campo dispara `salvarCampo` com o nome do campo certo;
 * - o modelo pronto dispara `aplicarPreset` com a chave certa.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AdvisorReguaConta from 'src/components/advisor/AdvisorReguaConta.vue';

const CONTA = {
  account_id: 'ACC1',
  account_nickname: 'MOGIVITTA',
  regua: {
    margin_pct: '30.00', profit_brl: '13.00', target_parado_pct: '30.00',
    target_medio_pct: '40.00', high_turnover_pct: '40.00', smart_signal_pct: '25.00',
  },
  regua_overrides: ['floor_profit_brl'],
};

const PRESETS = {
  conservador: {
    label: 'Conservador', floor_margin_pct: 35, floor_profit_brl: 25,
    target_margin_parado_pct: 35, target_margin_medio_pct: 45,
  },
};

const stubs = {
  'q-icon': true,
  'q-btn': {
    template: '<button :disabled="disable" @click="$emit(\'click\')"><slot />{{ label }}</button>',
    props: ['label', 'disable'],
  },
  'q-input': {
    template: '<input :data-label="label" :disabled="disable" @blur="$emit(\'blur\')" />',
    props: ['modelValue', 'disable', 'label', 'prefix', 'suffix'],
  },
  'q-select': {
    name: 'QSelectStub',
    template: '<select />',
    props: ['modelValue', 'options', 'disable', 'label'],
  },
};

function montar({ overrides = ['floor_profit_brl'], rascunho = {} } = {}) {
  const salvarCampo = vi.fn();
  const aplicarPreset = vi.fn();
  const reguas = {
    ACC1: {
      floor_margin_pct: null, floor_profit_brl: 30, target_margin_parado_pct: null,
      target_margin_medio_pct: null, high_turnover_margin_pct: null,
      smart_signal_margin_pct: null, ...rascunho,
    },
  };
  const wrapper = mount(AdvisorReguaConta, {
    props: {
      conta: { ...CONTA, regua_overrides: overrides },
      reguas,
      salvando: false,
      presets: PRESETS,
      salvarCampo,
      aplicarPreset,
      titulo: 'MOGIVITTA',
    },
    global: { stubs },
  });
  return { wrapper, salvarCampo, aplicarPreset, reguas };
}

describe('AdvisorReguaConta', () => {
  it('marca cada campo como "sua conta" ou "padrão da plataforma"', () => {
    const { wrapper } = montar();
    const selos = wrapper.findAll('.regua__badge').map((s) => s.text());
    expect(selos).toHaveLength(6);
    expect(selos.filter((t) => t === 'sua conta')).toHaveLength(1);
    expect(selos.filter((t) => t === 'padrão da plataforma')).toHaveLength(5);
  });

  it('"Restaurar padrão" só aparece nos campos com ajuste e grava null', async () => {
    const { wrapper, salvarCampo, reguas } = montar();
    const restaurar = wrapper.findAll('button').filter((b) => b.text().includes('Restaurar padrão'));
    expect(restaurar).toHaveLength(1);

    await restaurar[0].trigger('click');
    expect(reguas.ACC1.floor_profit_brl).toBeNull();
    expect(salvarCampo).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'ACC1' }), 'floor_profit_brl',
    );
  });

  it('sem override nenhum, não há o que restaurar', () => {
    const { wrapper } = montar({ overrides: [] });
    expect(wrapper.findAll('button').filter((b) => b.text().includes('Restaurar padrão'))).toHaveLength(0);
  });

  it('blur num campo dispara salvarCampo com o nome do campo certo', async () => {
    const { wrapper, salvarCampo } = montar();
    const alvo = wrapper.findAll('input')
      .find((i) => i.attributes('data-label') === 'Margem mínima');
    await alvo.trigger('blur');
    expect(salvarCampo).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'ACC1' }), 'floor_margin_pct',
    );
  });

  it('o modelo pronto dispara aplicarPreset com a chave certa', async () => {
    const { wrapper, aplicarPreset } = montar();
    wrapper.findComponent({ name: 'QSelectStub' }).vm.$emit('update:model-value', 'conservador');
    expect(aplicarPreset).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'ACC1' }), 'conservador',
    );
  });
});
