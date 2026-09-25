// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FinanceiroDespesas from 'src/components/financeiro/FinanceiroDespesas.vue'

const despesas = vi.hoisted(() => ({
  getLancamentos: vi.fn(),
  getResumo: vi.fn(),
  criarLancamento: vi.fn(),
  atualizarLancamento: vi.fn(),
  removerLancamento: vi.fn(),
  getCategorias: vi.fn(),
}))
const fiscal = vi.hoisted(() => ({ getCnpjs: vi.fn() }))

vi.mock('src/services/DespesasService', () => ({ default: despesas }))
vi.mock('src/services/FiscalService', () => ({ default: fiscal }))

const LINHAS = [
  {
    id: 1,
    competencia: '2026-08',
    categoria: 10,
    categoria_nome: 'Aluguel',
    categoria_fora_do_resultado: false,
    descricao: 'Aluguel do galpão',
    valor: '1500.00',
    data: '2026-08-05',
    origem: 'manual',
  },
  {
    id: 2,
    competencia: '2026-08',
    categoria: 11,
    categoria_nome: 'Antecipação de lucro',
    categoria_fora_do_resultado: true,
    descricao: 'Pró-labore dos sócios',
    valor: '8000.00',
    data: null,
    origem: 'planilha',
  },
  {
    id: 3,
    competencia: '2026-08',
    categoria: 12,
    categoria_nome: 'Energia',
    categoria_fora_do_resultado: false,
    descricao: 'Conta da concessionária',
    valor: '420.00',
    data: '2026-08-10',
    origem: 'nota',
  },
]

const CATEGORIAS = [
  { id: 10, nome: 'Aluguel', fora_do_resultado: false },
  { id: 11, nome: 'Antecipação de lucro', fora_do_resultado: true },
  { id: 12, nome: 'Energia', fora_do_resultado: false },
]

const RESUMO = {
  total: '9920.00',
  dentro_do_resultado: '1920.00',
  fora_do_resultado: '8000.00',
  deducoes_da_receita: '0.00',
  lancamentos: 3,
  observacoes: [],
}

const stubs = {
  QSelect: { template: '<div />' },
  QInput: { template: '<div />' },
  QBtn: {
    props: ['disable', 'loading', 'label'],
    template: '<button :disabled="disable">{{ label }}<slot /></button>',
  },
  QTooltip: { template: '<span />' },
  QIcon: { template: '<i />' },
  QSpace: { template: '<span />' },
  QSpinnerDots: { template: '<i />' },
  QDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialogo"><slot /></div>',
  },
  QCard: { template: '<div><slot /></div>' },
  QCardSection: { template: '<div><slot /></div>' },
  QCardActions: { template: '<div><slot /></div>' },
  // Apresentação e recorte: fora do escopo deste teste.
  FinanceiroRecorte: true,
  SbKpiCard: { props: ['label', 'value'], template: '<div class="kpi">{{ label }} {{ value }}</div>' },
}

function montar() {
  return mount(FinanceiroDespesas, { global: { stubs } })
}

describe('FinanceiroDespesas — leitura (FINT-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    despesas.getLancamentos.mockResolvedValue({ data: { lancamentos: LINHAS, resumo: RESUMO } })
    despesas.getResumo.mockResolvedValue({ data: RESUMO })
    despesas.atualizarLancamento.mockResolvedValue({ data: {} })
    despesas.removerLancamento.mockResolvedValue({ data: {} })
    fiscal.getCnpjs.mockResolvedValue({ data: [{ id: 7, cnpj: '41641514000103', razao_social: 'DOSE' }] })
    despesas.getCategorias.mockResolvedValue({ data: CATEGORIAS })
  })

  it('desenha uma linha por lançamento e destaca o que está fora do resultado', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.findAll('tbody tr')[1].classes()).toContain('linha--fora-do-resultado')
    expect(wrapper.findAll('tbody tr')[0].classes()).not.toContain('linha--fora-do-resultado')
  })

  it('mostra os totais que o backend separou, sem somar o que não se soma', async () => {
    const wrapper = montar()
    await flushPromises()

    const texto = wrapper.text()
    expect(texto).toContain('Entra no resultado')
    expect(texto).toContain('Fora do resultado')
    expect(texto).toContain('1.920,00')
    expect(texto).toContain('8.000,00')
  })

  it('lançamento vindo de nota não abre edição — as outras células abrem', async () => {
    const wrapper = montar()
    await flushPromises()

    const linhas = wrapper.findAll('tbody tr')
    // 4 células editáveis (categoria, descrição, valor, data) nas duas primeiras linhas; nenhuma na nota.
    expect(linhas[0].findAll('button.is-editavel')).toHaveLength(4)
    expect(linhas[2].findAll('button.is-editavel')).toHaveLength(0)
    expect(linhas[2].find('.is-somente-leitura').exists()).toBe(true)
  })
})

describe('FinanceiroDespesas — gravação (FINT-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    despesas.getLancamentos.mockResolvedValue({ data: { lancamentos: LINHAS, resumo: RESUMO } })
    despesas.getResumo.mockResolvedValue({ data: RESUMO })
    despesas.atualizarLancamento.mockResolvedValue({ data: {} })
    despesas.removerLancamento.mockResolvedValue({ data: {} })
    fiscal.getCnpjs.mockResolvedValue({ data: [{ id: 7, cnpj: '41641514000103', razao_social: 'DOSE' }] })
    despesas.getCategorias.mockResolvedValue({ data: CATEGORIAS })
  })

  it('editar a descrição na célula salva pela API e atualiza o resumo', async () => {
    const wrapper = montar()
    await flushPromises()

    // Colunas: competência(0), categoria(1), descrição(2), valor(3), data(4), origem(5), ações(6).
    await wrapper.findAll('tbody tr')[0].findAll('td')[2].find('button.is-editavel').trigger('click')
    const campo = wrapper.find('tbody input')
    await campo.setValue('Aluguel do galpão — agosto')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(despesas.atualizarLancamento).toHaveBeenCalledWith(1, {
      descricao: 'Aluguel do galpão — agosto',
    })
    expect(despesas.getResumo).toHaveBeenCalled()
  })

  it('remover pede confirmação antes de excluir', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('tbody tr')[0].findAll('td')[6].find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.dialogo').exists()).toBe(true)
    expect(wrapper.find('.dialogo').text()).toContain('Aluguel do galpão')

    const remover = wrapper.findAll('.dialogo button').find((botao) => botao.text() === 'Remover')
    await remover.trigger('click')
    await flushPromises()

    expect(despesas.removerLancamento).toHaveBeenCalledWith(1)
  })

  it('sem categoria cadastrada o botão de criar fica desabilitado e o vazio diz o que falta', async () => {
    despesas.getCategorias.mockResolvedValue({ data: [] })
    despesas.getLancamentos.mockResolvedValue({
      data: { lancamentos: [], resumo: { ...RESUMO, lancamentos: 0 } },
    })

    const wrapper = montar()
    await flushPromises()

    const novo = wrapper.findAll('button').find((botao) => botao.text().includes('Nova despesa'))
    expect(novo.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('importe a planilha de gestão')
  })
})
