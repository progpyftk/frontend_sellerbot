// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FinanceiroLivro from 'src/components/financeiro/FinanceiroLivro.vue'

const contabil = vi.hoisted(() => ({
  getLancamentos: vi.fn(),
  getPlanoDeContas: vi.fn(),
}))

vi.mock('src/services/ContabilService', () => ({ default: contabil }))

// O composable da URL usa `useRoute`/`useRouter`; no teste unitário a aba recebe refs soltos.
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

const LANCAMENTOS = [
  {
    id: 1,
    competencia: '2026-08',
    data: '2026-08-12',
    historico: 'DAS — Simples Nacional',
    origem: 'das',
    origem_ref: 'das:2026-08',
    is_estorno: false,
    partidas: [
      { id: 1, codigo: '3.3.1.01', conta: 'DAS', debito: '15312.62', credito: '0.00' },
      { id: 2, codigo: '2.1.4.01', conta: 'DAS a recolher', debito: '0.00', credito: '15312.62' },
    ],
  },
  {
    id: 2,
    competencia: '2026-08',
    data: '2026-08-20',
    historico: 'Estorno da NFS-e 123',
    origem: 'nfse',
    origem_ref: 'estorno:9',
    is_estorno: true,
    partidas: [
      { id: 3, codigo: '5.3.1.03', conta: 'Comissão', debito: '0.00', credito: '20.50' },
      { id: 4, codigo: '2.1.5.01', conta: 'Fornecedores', debito: '20.50', credito: '0.00' },
    ],
  },
]

const PLANO = [
  {
    codigo: '3.3.1.01',
    nome: 'DAS — Simples Nacional',
    natureza: 'despesa',
    grupo: 'impostos',
    aceita_lancamento: true,
    dre_linha: 'impostos_sobre_a_receita',
    bp_grupo: null,
    dfc_atividade: 'operacional',
    entra_na_mc: false,
    fora_do_resultado: false,
  },
  {
    codigo: '3.3',
    nome: 'Impostos sobre a receita',
    natureza: 'despesa',
    grupo: 'impostos',
    aceita_lancamento: false,
    dre_linha: null,
    bp_grupo: null,
    dfc_atividade: null,
    entra_na_mc: false,
    fora_do_resultado: false,
  },
]

const stubs = {
  QSelect: { template: '<div />' },
  QInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  QBtnToggle: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<div class="toggle"><button v-for="o in options" :key="o.value" class="opcao" @click="$emit(\'update:modelValue\', o.value)">{{ o.label }}</button></div>',
  },
  QBtn: {
    props: ['disable', 'loading', 'label'],
    template: '<button :disabled="disable">{{ label }}<slot /></button>',
  },
  QTooltip: { template: '<span><slot /></span>' },
  QIcon: { template: '<i />' },
  QSpace: { template: '<span />' },
  QSpinnerDots: { template: '<i />' },
  // O recorte é stub, mas **precisa renderizar o slot**: o toggle e a busca vivem nele.
  FinanceiroRecorte: { template: '<div><slot /></div>' },
}

function montar() {
  return mount(FinanceiroLivro, { global: { stubs } })
}

describe('FinanceiroLivro — lançamentos (FINT-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contabil.getLancamentos.mockResolvedValue({ data: { lancamentos: LANCAMENTOS } })
    contabil.getPlanoDeContas.mockResolvedValue({ data: { plano: PLANO } })
  })

  it('desenha os lançamentos com as partidas e o estorno marcado', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('DAS — Simples Nacional')
    expect(wrapper.findAll('tbody tr')[1].classes()).toContain('linha--estorno')
    expect(wrapper.text()).toContain('estorno')
  })

  it('mostra o resumo do recorte com o total de débito', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('2 lançamento(s)')
    expect(wrapper.text()).toContain('15.333,12')
  })

  it('a busca filtra no cliente, sem nova chamada à API', async () => {
    const wrapper = montar()
    await flushPromises()
    expect(contabil.getLancamentos).toHaveBeenCalledTimes(1)

    await wrapper.find('input').setValue('estorno')
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('Estorno da NFS-e 123')
    expect(contabil.getLancamentos).toHaveBeenCalledTimes(1)
  })

  it('o detalhe mostra as partidas e deixa o estorno visível como pendência', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('tbody button.sb-tabela__abrir')[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('DAS a recolher')
    expect(wrapper.text()).toContain('débito = crédito')
    expect(wrapper.text()).toContain('FINT-17')

    const estornar = wrapper.findAll('button').find((botao) => botao.text().includes('Estornar'))
    expect(estornar.attributes('disabled')).toBeDefined()
  })
})

describe('FinanceiroLivro — plano de contas (FINT-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contabil.getLancamentos.mockResolvedValue({ data: { lancamentos: LANCAMENTOS } })
    contabil.getPlanoDeContas.mockResolvedValue({ data: { plano: PLANO } })
  })

  it('troca para o plano e separa analítica de sintética', async () => {
    const wrapper = montar()
    await flushPromises()

    const opcao = wrapper.findAll('.opcao').find((botao) => botao.text() === 'Plano de contas')
    await opcao.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('aceita')
    expect(wrapper.text()).toContain('sintética')
    expect(wrapper.findAll('tbody tr')[1].classes()).toContain('linha--sintetica')
  })
})
