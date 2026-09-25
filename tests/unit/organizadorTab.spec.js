// @vitest-environment jsdom
/**
 * Testes da aba Organizador (ADSA-34 · unidade de patrocínio).
 *
 * O que protegem:
 * - os anúncios parados (idle/hold/deleted) aparecem como indicador, com o detalhe por status;
 * - produto de catálogo aparece com o marcador `·CAT` e os MLBs irmãos na MESMA linha;
 * - sem `anuncios_parados` no payload o indicador mostra zero, com hint de "todos patrocinam";
 * - o aviso de parados aparece no bloco de avisos do topo.
 *
 * O marcador virou `·CAT` e o nome passou a caber no limite de ~29 caracteres do Mercado
 * Livre (ADSA-39); a fixture usa o nome que o backend produz de verdade (ADSA-40) — com
 * `· catálogo`, ela passava sem proteger nada do marcador.
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
      nome: 'Casca De Pinus Polida… ·CAT',
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
  // O painel de detalhe vive num q-dialog/q-card. Sem stub, o Vue não resolve os
  // componentes e o conteúdo do painel nunca é renderizado — o `v-if="detalhe"` garante
  // que nada aparece nos testes que não abrem o painel.
  'q-dialog': { template: '<div><slot /></div>', props: ['modelValue'] },
  'q-card': { template: '<div><slot /></div>' },
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

  it('mostra o marcador ·CAT no nome da campanha sugerida', async () => {
    const w = await montar();
    expect(w.text()).toContain('Casca De Pinus Polida… ·CAT');
  });

  it('mostra o nome inteiro, sem cortar o que o ML aceitaria', async () => {
    // O nome truncado em 29 caracteres é decisão do backend (ADSA-39); a aba não pode
    // encurtar mais nem trocar o marcador, senão o dono digita no ML outro nome.
    const w = await montar();
    const linhas = w.findAll('tr').map((tr) => tr.text());
    const linha = linhas.find((t) => t.includes('Casca De Pinus Polida'));
    expect(linha).toContain('Casca De Pinus Polida… ·CAT');
    expect(linha).not.toContain('Catálogo');
  });

  it('mostra os MLBs irmãos do produto na MESMA linha', async () => {
    const w = await montar();
    expect(w.text()).toContain('MLB4215711751');
    expect(w.text()).toContain('MLB4215446123');
  });
});

describe('OrganizadorTab · "só as que faltam" e frescor do sync (ADSA-38)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('mostra a contagem de pendentes no filtro', async () => {
    const w = await montar();
    // a única linha do fixture não está aplicada nem marcada -> falta 1
    expect(w.text()).toContain('só as que faltam (1)');
  });

  it('avisa quando o vínculo do sync está velho e manda sincronizar', async () => {
    const velho = {
      ...PAYLOAD,
      confianca: { ...PAYLOAD.confianca, dias_desde_sync: 0.5 },
    };
    const w = await montar(velho);
    expect(w.text()).toContain('sincronizado há 12h');
    expect(w.text()).toContain('Sincronizar Ads');
  });

  it('não avisa quando o vínculo é fresco', async () => {
    const w = await montar();
    expect(w.text()).not.toContain('vínculo anúncio↔campanha sincronizado');
  });
});

// ── ADSA-42 · a linha do plano diz em que situação está ─────────────────────
//
// O que protegem:
// - a coluna de situação traduz o estado em "o que fazer", não em jargão;
// - campanha incompleta conta como faltando (o dono completa a que existe, não cria outra);
// - campanha que existe mas diverge também é trabalho pendente;
// - o detalhe diz o que entra e para onde vai o que sai;
// - sem `estado_disponivel` (conta que não sincronizou desde o ADSA-41) a aba volta ao
//   "já aplicada" de sempre em vez de inventar que tudo está por fazer.
const COM_ESTADO = {
  ...CONTA,
  estado_disponivel: true,
  campanhas_sugeridas: [
    {
      ...CONTA.campanhas_sugeridas[0],
      nome: 'Substrato - Casca de Pinus 1',
      estado: 'atencao',
      campanha_real: 'Casca De Pinus Antiga',
      entra: ['MLB4215711751'],
      sai: ['MLB4215446123'],
    },
    {
      ...CONTA.campanhas_sugeridas[0],
      nome: 'Ureia 46% 4kg',
      estado: 'nao_criada',
      campanha_real: null,
      entra: ['MLB4219000001'],
      sai: [],
    },
    {
      ...CONTA.campanhas_sugeridas[0],
      nome: 'Kits 2',
      estado: 'ajustar',
      campanha_real: 'Kits',
      entra: [],
      sai: [],
    },
    {
      ...CONTA.campanhas_sugeridas[0],
      nome: 'Basacote 3m',
      estado: 'ok',
      campanha_real: 'Basacote 3m',
      entra: [],
      sai: [],
    },
  ],
  estrutura_alvo: [
    {
      item_id: 'MLB4215446123',
      titulo: 'Casca de pinus 3kg',
      campanha_alvo: { nome: 'Substrato - Casca de Pinus 2' },
      campanha_atual: { nome: 'Casca De Pinus Antiga', qtd_anuncios: 2 },
      motivo: { texto: 'produto mais vendido da família', regra: 'pareto', decisao: 'B' },
    },
  ],
};

describe('OrganizadorTab · situação de cada linha (ADSA-42)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('traduz o estado em o que o dono tem que fazer', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_ESTADO] });
    const texto = w.text();
    expect(texto).toContain('pronta');
    expect(texto).toContain('criar');
    expect(texto).toContain('completar');
    expect(texto).toContain('ajustar');
  });

  it('conta como faltando o que ainda não existe e o que está incompleto', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_ESTADO] });
    // nao_criada + ajustar = 2. "atenção" também é trabalho, mas o filtro "só as que
    // faltam" é o que o dono cumpre criando; o resto entra pelo ajuste.
    expect(w.text()).toContain('só as que faltam (2)');
  });

  it('o contador do topo mostra o trabalho que sobra, não o histórico', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_ESTADO] });
    expect(w.text()).toContain('3 a resolver de 4');
    expect(w.text()).toContain('1 prontas');
  });

  it('o detalhe diz o que entra e para onde vai o que sai', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_ESTADO] });
    const linhas = w.findAll('tr').map((tr) => tr.text());
    const idx = linhas.findIndex((t) => t.includes('Substrato - Casca de Pinus 1'));
    await w.findAll('tr')[idx].trigger('click');
    await flushPromises();
    const painel = w.find('.org__painel');
    expect(painel.exists()).toBe(true);
    expect(painel.text()).toContain('Entra nesta campanha');
    expect(painel.text()).toContain('Sai desta campanha (vai para)');
    expect(painel.text()).toContain('Substrato - Casca de Pinus 2');
  });

  it('avisa que é só o nome quando os anúncios batem', async () => {
    const soNome = {
      ...COM_ESTADO,
      campanhas_sugeridas: [
        { ...COM_ESTADO.campanhas_sugeridas[0], estado: 'atencao', entra: [], sai: [] },
        ...COM_ESTADO.campanhas_sugeridas.slice(1),
      ],
    };
    const w = await montar({ ...PAYLOAD, contas: [soNome] });
    const linhas = w.findAll('tr').map((tr) => tr.text());
    const idx = linhas.findIndex((t) => t.includes('Substrato - Casca de Pinus 1'));
    await w.findAll('tr')[idx].trigger('click');
    await flushPromises();
    const painel = w.find('.org__painel');
    expect(painel.text()).toContain('ajustar o que já existe');
    expect(painel.text()).toContain('com os mesmos anúncios');
  });

  it('sem estado disponível, mantém o "já aplicada" e não inventa pendência', async () => {
    const w = await montar();
    expect(w.text()).toContain('só as que faltam (1)');
    expect(w.text()).toContain('campanhas já criadas');
    expect(w.text()).not.toContain('a resolver de');
  });

  it('estado que a tela não conhece vira "revisar", nunca "a criar"', async () => {
    // Se o backend ganhar um estado novo e o frontend for atrás, o pior erro possível é
    // dizer "criar": o dono criaria campanha que já existe.
    const exotico = {
      ...COM_ESTADO,
      campanhas_sugeridas: [
        { ...COM_ESTADO.campanhas_sugeridas[0], estado: 'reorganizando' },
        ...COM_ESTADO.campanhas_sugeridas.slice(1),
      ],
    };
    const w = await montar({ ...PAYLOAD, contas: [exotico] });
    expect(w.text()).toContain('revisar');
    expect(w.text()).toContain('1 para revisar');
    // Não entrou na contagem de "para criar": 2 (não criada + completar), não 3.
    expect(w.text()).toContain('só as que faltam (2)');
  });
});

// ── ADSA-45 · o porquê da linha, a ordem e a paginação ──────────────────────
//
// O que protegem:
// - a linha mostra POR QUE está em "ajustar" (o texto vem do backend, não é inventado aqui);
// - a ordem padrão é o maior custo de Ads primeiro, que é a ordem de execução do dono;
// - a situação ordena por gravidade, e não em ordem alfabética;
// - 149 linhas paginadas em 50, com o rodapé dizendo onde o dono está;
// - o filtro "só as que faltam" recomeça na primeira página.
const COM_CUSTO = {
  ...COM_ESTADO,
  campanhas_sugeridas: COM_ESTADO.campanhas_sugeridas.map((c, i) => ({
    ...c,
    custo_ads: [10, 300, 50, 200][i] ?? 0,
    erros_estado: i === 0 ? ['MLB planejado fora da campanha: [MLB2]'] : [],
    notas_estado:
      i === 0
        ? ['os MLB batem exatamente; nome criado difere: "Casca De Pinus Antiga"']
        : [],
  })),
};

describe('OrganizadorTab · o porquê, a ordem e a paginação (ADSA-45)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('a linha mostra o motivo, e o detalhe mostra o texto inteiro', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_CUSTO] });
    // Na célula vai o primeiro motivo, que é o erro: é ele que muda a tela (falta MLB).
    expect(w.text()).toContain('MLB planejado fora da campanha');
    // A nota ("nome criado difere") entra como detalhe, e não concorre com o erro.
    expect(w.text()).not.toContain('nome criado difere');

    const linhas = w.findAll('tr').map((tr) => tr.text());
    const idx = linhas.findIndex((t) => t.includes('Substrato - Casca de Pinus 1'));
    await w.findAll('tr')[idx].trigger('click');
    await flushPromises();
    const painel = w.find('.org__painel');
    expect(painel.text()).toContain('Por que está assim');
    expect(painel.text()).toContain('os MLB batem exatamente; nome criado difere');
  });

  it('a linha que só tem nota mostra a nota, não umarazão genérica', async () => {
    const soNota = {
      ...COM_ESTADO,
      campanhas_sugeridas: [
        { ...COM_ESTADO.campanhas_sugeridas[0], erros_estado: [], notas_estado: ['os MLB batem exatamente; nome criado difere: "X"'] },
        ...COM_ESTADO.campanhas_sugeridas.slice(1),
      ],
    };
    const w = await montar({ ...PAYLOAD, contas: [soNota] });
    expect(w.text()).toContain('nome criado difere');
    // O texto do backend vem com o prefixo que só faz sentido no relatório.
    expect(w.text()).not.toContain('os MLB batem exatamente;');
  });

  it('a tabela abre pelo maior custo de Ads', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_CUSTO] });
    const nomes = w.findAll('tr').map((tr) => tr.text());
    // custos 10, 300, 50, 200 na ordem do fixture -> Ureia (300), Basacote (200),
    // Kits 2 (50), Casca de Pinus (10).
    expect(nomes[1]).toContain('Ureia 46% 4kg');
    expect(nomes[2]).toContain('Basacote 3m');
    expect(nomes[3]).toContain('Kits 2');
    expect(nomes[4]).toContain('Substrato - Casca de Pinus 1');
  });

  it('ordenar pela situação põe o que está errado na frente do que está pronto', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_CUSTO] });
    const th = w.findAll('th').find((t) => t.text().includes('Situação'));
    await th.trigger('click');
    await flushPromises();
    const nomes = w.findAll('tr').map((tr) => tr.text());
    // Subindo por gravidade: não criada, completar, ajustar e (por último) pronta.
    expect(nomes[1]).toContain('Ureia 46% 4kg');
    expect(nomes[2]).toContain('Kits 2');
    expect(nomes[3]).toContain('Substrato - Casca de Pinus 1');
    expect(nomes[4]).toContain('Basacote 3m');
  });

  it('o segundo clique na mesma coluna inverte a ordem', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_CUSTO] });
    const th = w.findAll('th').find((t) => t.text().includes('Custo Ads'));
    await th.trigger('click');
    await flushPromises();
    const subindo = w.findAll('tr').map((tr) => tr.text());
    expect(subindo[1]).toContain('Substrato - Casca de Pinus 1');
    await th.trigger('click');
    await flushPromises();
    const descendo = w.findAll('tr').map((tr) => tr.text());
    expect(descendo[1]).toContain('Ureia 46% 4kg');
  });

  it('ordenar por texto ignora acento e caixa, e manda vazio para o fim', async () => {
    const comVazios = {
      ...COM_ESTADO,
      campanhas_sugeridas: [
        { ...COM_ESTADO.campanhas_sugeridas[0], nome: 'Casca de pinus', roas_target: null },
        { ...COM_ESTADO.campanhas_sugeridas[0], nome: 'casca DE PINUS 2' },
        { ...COM_ESTADO.campanhas_sugeridas[0], nome: 'zzz ultimo' },
      ],
    };
    const w = await montar({ ...PAYLOAD, contas: [comVazios] });
    const th = w.findAll('th').find((t) => t.text().includes('ROAS alvo'));
    await th.trigger('click');
    await flushPromises();
    const nomes = w.findAll('tr').map((tr) => tr.text());
    // ROAS null não é "o menor": falta número vai para o fim, em qualquer direção.
    expect(nomes[nomes.length - 1]).toContain('Casca de pinus');

    const thNome = w.findAll('th').find((t) => t.text().includes('Campanha'));
    await thNome.trigger('click');
    await flushPromises();
    const porNome = w.findAll('tr').map((tr) => tr.text());
    expect(porNome[1]).toContain('Casca de pinus');
    expect(porNome[2]).toContain('casca DE PINUS 2');
  });

  it('pagina em 50 e o rodapé diz onde o dono está', async () => {
    const muitas = {
      ...COM_ESTADO,
      campanhas_sugeridas: Array.from({ length: 149 }, (_, i) => ({
        ...COM_ESTADO.campanhas_sugeridas[0],
        nome: `Campanha ${String(i + 1).padStart(3, '0')}`,
        custo_ads: 1000 - i,
      })),
    };
    const w = await montar({ ...PAYLOAD, contas: [muitas] });
    expect(w.findAll('tr').length).toBeLessThanOrEqual(51);
    expect(w.text()).toContain('149 linhas');
    expect(w.text()).toContain('mostrando 1–50');
  });

  it('com poucas linhas não inventa paginação', async () => {
    const w = await montar({ ...PAYLOAD, contas: [COM_ESTADO] });
    expect(w.text()).not.toContain('mostrando');
    expect(w.find('.org__paginacao').exists()).toBe(false);
  });
});

