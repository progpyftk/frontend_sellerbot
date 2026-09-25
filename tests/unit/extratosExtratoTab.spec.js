// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import ExtratosExtratoTab from 'src/components/financeiro/extratos/ExtratosExtratoTab.vue'

// A aba lê a ordem da URL (FINT-11); no teste unitário ela recebe refs soltos, sem router.
vi.mock('src/composables/useEstadoNaUrl', async () => {
  const { ref } = await import('vue')
  return {
    useEstadoNaUrl: () => ({
      empresa: ref(null),
      periodo: ref({ de: '', ate: '' }),
      ordenacao: ref({ chave: '', direcao: '' }),
      busca: ref(''),
    }),
  }
})

// Checkbox de mentira: clicar emite o contrário do estado atual, que é o que a tela usa.
const checkboxStub = {
  props: ['modelValue', 'indeterminate'],
  emits: ['update:model-value'],
  template: '<button class="chk" @click="$emit(\'update:model-value\', !modelValue)" />',
}

const stubs = {
  QSelect: { template: '<div />' },
  QInput: { template: '<div />' },
  QBtn: { template: '<button />' },
  QBtnToggle: { template: '<div />' },
  QSpace: { template: '<span />' },
  QBanner: { template: '<div><slot /></div>' },
  QIcon: { template: '<i />' },
  QLinearProgress: { template: '<div />' },
  QBadge: { template: '<span><slot /></span>' },
  QTooltip: { template: '<span />' },
  QToggle: { template: '<button class="toggle" />' },
  QCheckbox: checkboxStub,
  // Apresentação: fora do escopo deste teste.
  SbCard: { template: '<div><slot /></div>' },
  SbKpiCard: { template: '<div><slot /></div>' },
  SbCategoriaSelect: { template: '<div class="categoria" />' },
  QSpinnerDots: { template: '<i />' },
}

const LINHAS = [
  { id: 1, data: '2026-08-01', descricao: 'Pix recebido', valor: '100.00', conciliado: false },
  { id: 2, data: '2026-08-02', descricao: 'Tarifa bancária', valor: '-10.00', conciliado: false },
]

function ctxFake(overrides = {}) {
  return reactive({
    extratoFilters: { conta: 1, dataInicio: '', dataFim: '', classificacao: '' },
    contaOptions: [],
    filtroClassificacaoOptions: [],
    loadTransacoes: vi.fn(),
    transacoes: LINHAS,
    transacaoColumns: [
      { chave: 'data', rotulo: 'Data', tipo: 'data', ordenavel: true },
      { chave: 'descricao', rotulo: 'Descrição', tipo: 'texto', ordenavel: true },
      { chave: 'valor', rotulo: 'Valor', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
    ],
    selecionadas: [],
    loadingTransacoes: false,
    loadingCategorias: false,
    classificandoLote: false,
    reclassificando: false,
    classificacaoLote: '',
    gruposCategorias: [],
    savingTransacoes: new Set(),
    resumo: {
      total: 2,
      classificadas: 0,
      pendentes: 2,
      entradas_pendentes: 1,
      saidas_pendentes: 1,
      valor_pendente: '90.00',
    },
    totais: { entradas: '100.00', saidas: '10.00', liquido: '90.00' },
    contrapartesPendentes: 0,
    percentualPendente: 100,
    percentualPendenteTexto: '100%',
    termometroVariante: 'amber',
    termometroCor: 'amber',
    termometroMensagem: 'Falta classificar',
    verPendentes: vi.fn(),
    abrirContrapartes: vi.fn(),
    confirmarReclassificacao: vi.fn(),
    classificarSelecionadas: vi.fn(),
    saveTransacao: vi.fn(),
    origemInfo: () => null,
    ajudaDaCategoria: () => '',
    ...overrides,
  })
}

function montar(ctx) {
  return mount(ExtratosExtratoTab, { props: { ctx }, global: { stubs } })
}

describe('ExtratosExtratoTab — a tabela é a SbTabela (FINT-6)', () => {
  it('desenha uma linha por transação e a coluna de seleção', () => {
    const wrapper = montar(ctxFake())

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.findAll('tbody .chk')).toHaveLength(2)
    expect(wrapper.findAll('thead .chk')).toHaveLength(1)
  })

  it('usa o tipo da coluna: a data é formatada e o valor aparece', () => {
    const wrapper = montar(ctxFake())
    const texto = wrapper.find('tbody').text()

    expect(texto).toContain('Pix recebido')
    expect(texto).toContain('01/08/2026')
    expect(texto).toContain('100,00')
  })

  it('marcar uma linha escreve no ctx.selecionadas (quem alimenta o lote)', async () => {
    const ctx = ctxFake()
    const wrapper = montar(ctx)

    await wrapper.findAll('tbody .chk')[0].trigger('click')
    expect(ctx.selecionadas.map((linha) => linha.id)).toEqual([1])

    // Clicar de novo desmarca — é a mesma linha, não uma duplicata.
    await wrapper.findAll('tbody .chk')[0].trigger('click')
    expect(ctx.selecionadas).toEqual([])
  })

  it('selecionar todas marca a lista inteira e limpar devolve vazio', async () => {
    const ctx = ctxFake()
    const wrapper = montar(ctx)

    await wrapper.find('thead .chk').trigger('click')
    expect(ctx.selecionadas.map((linha) => linha.id)).toEqual([1, 2])

    await wrapper.find('thead .chk').trigger('click')
    expect(ctx.selecionadas).toEqual([])
  })

  it('lista vazia mostra o estado de vazio, não uma grade sem linhas', () => {
    const wrapper = montar(ctxFake({ transacoes: [] }))

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nenhuma transação encontrada')
  })
})
