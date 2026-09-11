// @vitest-environment jsdom
/**
 * Testes do bloco "Como funciona" (PROMO-IA-21 · F1).
 *
 * O que protegem:
 * - a régua e o piso aparecem em linguagem de negócio (o dono não lê código);
 * - o texto diz que NÃO existe teto de desconto (pendência real, não pode ficar implícita);
 * - "o que ele nunca faz" inclui SMART, cupom, preço-base e escrita dupla no mesmo ciclo;
 * - o glossário existe e cobre os termos que confundiam (leva, canário→aprovação, kill switch).
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AdvisorHowItWorks from 'src/components/promotions-ads/AdvisorHowItWorks.vue';
import SbInfoCallout from 'src/components/common/SbInfoCallout.vue';

const stubs = { 'q-icon': true, 'q-btn': true };

function montar() {
  const wrapper = mount(AdvisorHowItWorks, { global: { stubs } });
  return { wrapper, texto: () => wrapper.element.textContent.replace(/\u00a0/g, ' ') };
}

/** Texto com o detalhe aberto — é onde vivem régua, proibições e glossário. */
async function detalheTexto() {
  const wrapper = mount(AdvisorHowItWorks, { global: { stubs } });
  wrapper.findComponent(SbInfoCallout).vm.aberto = true;
  await wrapper.vm.$nextTick();
  return wrapper.element.textContent.replace(/\u00a0/g, ' ');
}

describe('AdvisorHowItWorks', () => {
  it('explica em uma frase o que é a função', () => {
    const { texto } = montar();
    expect(texto()).toContain('escrita automática ligada');
    expect(texto()).toContain('aplica a promoção');
  });

  it('abre o detalhe no clique (o resumo fica visível, a régua vem sob demanda)', async () => {
    const wrapper = mount(AdvisorHowItWorks, { global: { stubs } });
    const callout = wrapper.findComponent(SbInfoCallout);
    expect(callout.vm.aberto).toBe(false);
    callout.vm.aberto = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.html()).toContain('A régua que ele usa');
  });

  it('traz a régua, o piso por unidade vendida e o teto real aplicado', async () => {
    const texto = await detalheTexto();
    expect(texto).toContain('até a margem chegar a');   // régua
    expect(texto).toContain('40%');                     // vende médio
    expect(texto).toContain('unidade vendida');         // piso por unidade
    expect(texto).toContain('86,2%');                   // teto real do catálogo
    expect(texto).toContain('não existe teto de desconto'.replace('não', 'Não'));
  });

  it('lista o que ele nunca faz', async () => {
    const texto = await detalheTexto();
    for (const proibido of ['SMART', 'cupom', 'preço-base', 'abaixo do piso']) {
      expect(texto).toContain(proibido);
    }
  });

  it('tem glossário com os termos que confundiam', async () => {
    const texto = await detalheTexto();
    for (const termo of ['Leva', 'Aprovar a leva', 'Kill switch', 'Aguardando confirmação']) {
      expect(texto).toContain(termo);
    }
  });
});
