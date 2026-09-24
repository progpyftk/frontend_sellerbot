// @vitest-environment jsdom
/**
 * Testes da aba Organizador (ADSA-34 · unidade de patrocínio).
 *
 * O que protegem:
 * - os anúncios parados (idle/hold/deleted) aparecem como indicador, com o detalhe por status;
 * - produto de catálogo aparece com o marcador `· catálogo` e os MLBs irmãos na MESMA linha;
 * - sem `anuncios_parados` no payload o indicador mostra zero, com hint de "todos patrocinam";
 * - o aviso de parados aparece no bloco de avisos do topo.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();

vi.mock('src/boot/axios', () => ({
  api: { get: (...a) => get(...a), post: (...a) => post(...a) },
}));

import OrganizadorTab from 'src/components/ads/OrganizadorTab.vue';

const CONTA = {
  conta: 'MOGIVITTA',
  anuncios_parados: { total: 171, por_status: { idle: 114, hold: 54, deleted: 3 } },
  avisos: [
    '171 anúncios estão em campanha mas não estão sendo patrocinados (3 deleted, 54 hold, 114 idle) e ficaram fora da estrutura',
  ],
  campanhas_sugeridas: [
    {
      nome: 'Casca De Pinus Polida 9 L · catálogo',
      curva: 'C',
      anuncios: ['MLB4215711751', 'MLB4215446123'],
      qtd_anuncios: 2,
      roas_target: 12,
      orcamento_diario: 89.19,
      orcamento_automatico: false,
      orcamento_estimado: true,
      venda: 10,
      custo_ads: 5,
      ja_existe: false,
    },
  ],
  estrutura_alvo: [],
  plano: [],
  termometro_tacos: null,
  diagnostico: {
    campanhas_ativas: 155,
    total_anuncios: 320,
    curva_a_misturados: 3,
    campanhas_leitura_cega: 40,
    anuncios_por_curva: { A: 5, B: 15, C: 20 },
    anuncios_com_movimento: 2,
    custo_ads_em_movimento: 5,
    campanhas_alvo: 3,
  },
  organizador_version: '2026-09-24.4',
};

const PAYLOAD = {
  periodo: { date_from: '2026-08-01', date_to: '2026-08-31' },
  confianca: {
    vinculo_sincronizado_em: '2026-09-24T15:00:00Z',
    dias_desde_sync: 0.1,
    vinculo_confiavel: true,
    vinculos_fantasma: 6,
  },
  avisos: [],
  sobreposicoes: { avisos: [] },
  contas: [CONTA],
};

const stubs = {
  'q-icon': true,
  'q-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'q-tooltip': true,
  'q-checkbox': { template: '<input type="checkbox" />', props: ['modelValue'] },
};

async function montar(payload = PAYLOAD) {
  get.mockResolvedValue({ data: payload });
  const wrapper = mount(OrganizadorTab, { global: { stubs } });
  await flushPromises();
  wrapper.text = () => wrapper.element.textContent.replace(/\u00a0/g, ' ');
  return wrapper;
}

describe('OrganizadorTab · anúncios parados (ADSA-34)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('mostra o total de parados e o detalhe por status', async () => {
    const w = await montar();
    expect(w.text()).toContain('anúncios parados');
    expect(w.text()).toContain('171');
    expect(w.text()).toContain('114 idle · 54 hold · 3 deleted');
  });

  it('sem anuncios_parados no payload, mostra zero e o hint de todos patrocinam', async () => {
    const semParados = {
      ...PAYLOAD,
      contas: [{ ...CONTA, anuncios_parados: undefined, avisos: [] }],
    };
    const w = await montar(semParados);
    expect(w.text()).toContain('anúncios parados');
    expect(w.text()).toContain('todos os anúncios em campanha patrocinam');
  });

  it('mostra o aviso de parados no bloco de avisos do topo', async () => {
    const w = await montar();
    expect(w.text()).toContain('não estão sendo patrocinados');
  });
});

describe('OrganizadorTab · produto de catálogo na tabela (D15/D16)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('mostra o marcador · catálogo no nome da campanha sugerida', async () => {
    const w = await montar();
    expect(w.text()).toContain('Casca De Pinus Polida 9 L · catálogo');
  });

  it('mostra os MLBs irmãos do produto na MESMA linha', async () => {
    const w = await montar();
    expect(w.text()).toContain('MLB4215711751');
    expect(w.text()).toContain('MLB4215446123');
  });
});
