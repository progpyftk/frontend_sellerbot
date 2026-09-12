// @vitest-environment jsdom
/**
 * Testes da superfície "Automação" (PROMO-IA-22 · F3).
 *
 * É a superfície que ESCREVE política — então o que precisa ficar travado é:
 * - o estado vem do servidor e é RELIDO depois de cada gravação (nada de "achei que salvou");
 * - desligar uma conta grava só aquela conta;
 * - a leva inválida não vira gravação (e avisa);
 * - a pausa de emergência só acontece depois da confirmação e avisa que nada foi desfeito;
 * - a régua e o glossário estão na tela, ao lado do controle (pedido explícito do dono).
 */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAutomation = vi.fn();
const patchAutomation = vi.fn();

vi.mock('src/services/AdvisorService', () => ({
  default: {
    getAutomation: (...a) => getAutomation(...a),
    patchAutomation: (...a) => patchAutomation(...a),
  },
}));

import AdvisorAutomationPage from 'src/pages/advisor/AdvisorAutomationPage.vue';

const PAYLOAD = {
  write_mode_global: true,
  kill_switch: false,
  cycle_today: true,
  next_cycle_at: '2026-09-13T12:00:00Z',
  by_account: {
    ACC1: {
      account_nickname: 'MOGIVITTA', auto_write: true, wave_size: 10, paused: false,
      pause_reason: '', canary_pending: false, writes_today: 3,
      margin_alerts: [{
        kind: 'smart_low_margin', item_id: 'MLB3796050843', title: 'Adubo 2kg SMART',
        margin_pct: '23.2', profit_unit: 28.47, price: 119.14, threshold_pct: '25', at: null,
      }],
    },
    ACC2: {
      account_nickname: 'AGF_ORGANICS', auto_write: false, wave_size: 50, paused: false,
      pause_reason: '', canary_pending: true, writes_today: 0, margin_alerts: [],
    },
  },
};

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>', props: ['label'] },
  'q-toggle': { template: '<input type="checkbox" />', props: ['modelValue', 'label'] },
  'q-input': { template: '<input />', props: ['modelValue', 'label'] },
  'router-link': { template: '<a><slot /></a>' },
  'q-page': { template: '<div><slot /></div>' },
};

async function montar(payload = PAYLOAD) {
  getAutomation.mockResolvedValue({ data: payload });
  const wrapper = mount(AdvisorAutomationPage, { global: { stubs } });
  await flushPromises();
  wrapper.texto = () => wrapper.element.textContent.replace(/\u00a0/g, ' ');
  return wrapper;
}

describe('AdvisorAutomationPage', () => {
  beforeEach(() => {
    getAutomation.mockReset();
    patchAutomation.mockReset();
    patchAutomation.mockResolvedValue({ data: { success: true } });
  });

  it('diz quem escreve agora, pelo nome da conta', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('1 conta(s) escrevendo agora: MOGIVITTA');
  });

  it('com o kill switch ligado, avisa que nada é enviado', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.kill_switch = true;

    const texto = (await montar(payload)).texto();
    expect(texto).toContain('interruptor de emergência');
    expect(texto).toContain('Nada é enviado ao Mercado Livre');
    // e a conta autorizada aparece como travada, não como ativa
    expect(texto).toContain('Autorizada, mas travada');
  });

  it('conta autorizada e parada no portão não conta como escrevendo', async () => {
    const payload = JSON.parse(JSON.stringify(PAYLOAD));
    payload.by_account.ACC2.auto_write = true;   // autorizada, mas com canário pendente

    const wrapper = await montar(payload);
    const texto = wrapper.texto();
    expect(texto).toContain('1 conta(s) escrevendo agora: MOGIVITTA');
    expect(texto).toContain('esperam o seu aval');   // aviso de que há conta parada no portão
    expect(wrapper.vm.escrevendo.map((c) => c.account_id)).toEqual(['ACC1']);
    expect(wrapper.vm.esperandoAval.map((c) => c.account_id)).toEqual(['ACC2']);
  });

  it('mostra a régua e o glossário na própria tela', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('Margem-alvo por saúde de vendas');
    expect(texto).toContain('R$ 12 por venda');
    expect(texto).toContain('Uma escrita por anúncio por dia');
    expect(texto).toContain('Glossário');
    expect(texto).toContain('Portão');
  });

  it('desligar uma conta grava só aquela conta e relê o estado', async () => {
    const wrapper = await montar();
    getAutomation.mockClear();

    await wrapper.vm.ligarDesligar(wrapper.vm.contas[0], false);
    await flushPromises();

    expect(patchAutomation).toHaveBeenCalledWith({ account_id: 'ACC1', auto_write: false });
    expect(getAutomation).toHaveBeenCalledTimes(1);          // releu do servidor
    expect(wrapper.text()).toContain('o robô parou de escrever');
  });

  it('leva inválida não vira gravação', async () => {
    const wrapper = await montar();
    wrapper.vm.levas.ACC1 = 'zero';
    await wrapper.vm.salvarLeva(wrapper.vm.contas[0]);
    await flushPromises();

    expect(patchAutomation).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('número inteiro entre 1 e 200');
  });

  it('leva igual à do servidor não gasta gravação', async () => {
    const wrapper = await montar();
    await wrapper.vm.salvarLeva(wrapper.vm.contas[0]);
    expect(patchAutomation).not.toHaveBeenCalled();
  });

  it('leva nova grava e informa o valor', async () => {
    const wrapper = await montar();
    wrapper.vm.levas.ACC1 = 20;
    await wrapper.vm.salvarLeva(wrapper.vm.contas[0]);
    await flushPromises();

    expect(patchAutomation).toHaveBeenCalledWith({ account_id: 'ACC1', wave_size: 20 });
    expect(wrapper.text()).toContain('leva de 20 anúncios');
  });

  it('a pausa de emergência exige confirmação e diz que nada foi desfeito', async () => {
    const wrapper = await montar();
    expect(patchAutomation).not.toHaveBeenCalled();

    await wrapper.vm.pausar();
    await flushPromises();

    expect(patchAutomation).toHaveBeenCalledWith({ pause_all: true });
    expect(wrapper.text()).toContain('As promoções já aplicadas continuam no ar');
  });

  it('aprova a primeira leva de uma conta em canário', async () => {
    const wrapper = await montar();
    await wrapper.vm.aprovarLeva(wrapper.vm.contas[1]);
    await flushPromises();

    expect(patchAutomation).toHaveBeenCalledWith({ account_id: 'ACC2', canary_approved: true });
  });

  it('mostra o alerta de margem SMART sem prometer escrita', async () => {
    const texto = (await montar()).texto();
    expect(texto).toContain('MLB3796050843');
    expect(texto).toContain('abaixo do limite de 25,0%');
    expect(texto).toContain('não escreve');
  });

  it('erro de gravação aparece para o dono', async () => {
    patchAutomation.mockRejectedValue({ response: { data: { error: 'Conta não encontrada no seu escopo.' } } });
    const wrapper = await montar();

    await wrapper.vm.ligarDesligar(wrapper.vm.contas[0], true);
    await flushPromises();

    expect(wrapper.text()).toContain('Conta não encontrada no seu escopo.');
  });
});
