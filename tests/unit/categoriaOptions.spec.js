// Montagem das opções do seletor de categoria do plano de contas (FIN-8).
// O que importa proteger: o cabeçalho de grupo aparecer uma vez por grupo, a busca achar
// sem acento e as marcas que mudam a leitura do DRE (`mc`, `fora_do_resultado`) chegarem
// intactas ao rótulo.
import { describe, expect, it } from 'vitest'
import { montarOpcoes, normalizarBusca } from 'src/components/common/categoriaOptions'

const GRUPOS = [
  {
    nome: 'Tributos',
    categorias: [
      { codigo: '3.3.1.01', rotulo: 'DAS — Simples Nacional', mc: false, fora_do_resultado: false },
      { codigo: 'trib:federal', rotulo: 'Tributo federal recolhido', mc: false, fora_do_resultado: false },
    ],
  },
  {
    nome: 'Despesas comerciais',
    categorias: [
      { codigo: '5.3.1.06', rotulo: 'Frete sobre vendas', mc: true, fora_do_resultado: false, ajuda: 'não somar de novo' },
      { codigo: '5.3.1.08', rotulo: 'Embalagens', mc: true, fora_do_resultado: false },
    ],
  },
  {
    nome: 'Movimentações (fora do resultado)',
    categorias: [
      { codigo: 'mov:transferencia_propria', rotulo: 'Transferência entre contas próprias', mc: false, fora_do_resultado: true },
    ],
  },
]

describe('normalizarBusca', () => {
  it('ignora acento, caixa e espaço nas pontas', () => {
    expect(normalizarBusca('  Transferência  ')).toBe('transferencia')
    expect(normalizarBusca('REFEIÇÃO')).toBe('refeicao')
    expect(normalizarBusca(null)).toBe('')
  })
})

describe('montarOpcoes', () => {
  it('achata os grupos preservando a ordem e o valor de cada categoria', () => {
    const opcoes = montarOpcoes(GRUPOS)
    expect(opcoes).toHaveLength(5)
    expect(opcoes.map((o) => o.value)).toEqual([
      '3.3.1.01',
      'trib:federal',
      '5.3.1.06',
      '5.3.1.08',
      'mov:transferencia_propria',
    ])
  })

  it('marca inicioGrupo só na primeira opção de cada grupo', () => {
    const inicios = montarOpcoes(GRUPOS)
      .filter((o) => o.inicioGrupo)
      .map((o) => o.grupo)
    expect(inicios).toEqual([
      'Tributos',
      'Despesas comerciais',
      'Movimentações (fora do resultado)',
    ])
  })

  it('leva as marcas do plano de contas para a opção', () => {
    const porCodigo = Object.fromEntries(montarOpcoes(GRUPOS).map((o) => [o.value, o]))
    expect(porCodigo['5.3.1.06'].mc).toBe(true)
    expect(porCodigo['5.3.1.06'].ajuda).toBe('não somar de novo')
    expect(porCodigo['mov:transferencia_propria'].foraDoResultado).toBe(true)
    expect(porCodigo['3.3.1.01'].mc).toBe(false)
  })

  it('busca sem acento encontra a categoria pelo rótulo', () => {
    const opcoes = montarOpcoes(GRUPOS, 'transferencia')
    expect(opcoes.map((o) => o.value)).toEqual(['mov:transferencia_propria'])
    // o grupo continua marcado, senão o cabeçalho some quando o filtro recorta
    expect(opcoes[0].inicioGrupo).toBe(true)
  })

  it('busca também pelo código da conta e pelo nome do grupo', () => {
    expect(montarOpcoes(GRUPOS, '5.3.1.08').map((o) => o.value)).toEqual(['5.3.1.08'])
    expect(montarOpcoes(GRUPOS, 'tributos').map((o) => o.value)).toEqual([
      '3.3.1.01',
      'trib:federal',
    ])
  })

  it('não encontra nada devolve lista vazia (e não quebra)', () => {
    expect(montarOpcoes(GRUPOS, 'zzzz')).toEqual([])
    expect(montarOpcoes(undefined)).toEqual([])
    expect(montarOpcoes([{ nome: 'X' }])).toEqual([])
  })
})
