import { describe, expect, it } from 'vitest'

import {
  diagnosticoDaBase,
  parametrosDaMargem,
  ressalvasDaMargem,
  rotuloCompetencia,
  rotuloDaBase,
  rotuloMarketplace,
  rotuloNivel,
  somaEmbalagem,
} from 'src/utils/margem'

const TEXTO_BASE_INCOMPLETA =
  'base de pedidos incompleta: o GMV dos pedidos cobre 4.9344% da receita declarada, entao 95.1% do faturamento esta sem base de custo e a MC esta SUPERESTIMADA'
const TEXTO_DIVERGENCIA =
  'a base de pedidos passa a receita declarada em 32.7%: e divergencia de base (ticket FIN-21b), nao MC superestimada'

describe('parametrosDaMargem', () => {
  it('descarta filtros vazios para o backend não receber 400', () => {
    expect(
      parametrosDaMargem({ cnpj: '', marketplace: null, sku: '   ', de: '', ate: '', nivel: 'marketplace' }),
    ).toEqual({ nivel: 'marketplace' })
  })

  it('mantém os filtros preenchidos, com trim no texto', () => {
    expect(
      parametrosDaMargem({
        cnpj: '41641514000103',
        fiscal_account: 7,
        marketplace: 'ml',
        sku: ' SKU-A ',
        de: '2026-08',
        ate: '2026-08-31',
        nivel: 'sku',
      }),
    ).toEqual({
      cnpj: '41641514000103',
      fiscal_account: 7,
      marketplace: 'ml',
      sku: 'SKU-A',
      de: '2026-08',
      ate: '2026-08-31',
      nivel: 'sku',
    })
  })
})

describe('diagnosticoDaBase', () => {
  it('marca base incompleta quando a cobertura fica abaixo de 90%', () => {
    const diag = diagnosticoDaBase({ base_completa: false, cobertura_da_base_pct: '4.9344' })
    expect(diag.incompleta).toBe(true)
    expect(diag.sem_regua).toBe(false)
    expect(diag.divergencia).toBe(false)
    expect(diag.cobertura).toBeCloseTo(4.9344)
  })

  it('marca divergência de base (acima de 110%) sem tratar como erro', () => {
    const diag = diagnosticoDaBase({ base_completa: true, cobertura_da_base_pct: '132.0000' })
    expect(diag.incompleta).toBe(false)
    expect(diag.divergencia).toBe(true)
  })

  it('trata ausência de PGDASD como base incompleta sem régua', () => {
    const diag = diagnosticoDaBase({ base_completa: false, cobertura_da_base_pct: null })
    expect(diag.incompleta).toBe(true)
    expect(diag.sem_regua).toBe(true)
    expect(rotuloDaBase(diag)).toBe('Sem PGDASD para medir')
  })

  it('considera completa a linha de contrato antigo, sem o campo', () => {
    expect(diagnosticoDaBase({}).incompleta).toBe(false)
  })
})

describe('ressalvasDaMargem', () => {
  it('sinaliza MC superestimada quando falta embalagem ou imposto', () => {
    const ressalvas = ressalvasDaMargem([
      { embalagem_informada: false, impostos_informados: true, observacoes: ['embalagem nao cadastrada'] },
      { embalagem_informada: true, impostos_informados: false, observacoes: [] },
      { embalagem_informada: true, impostos_informados: true, observacoes: ['ok'] },
    ])

    expect(ressalvas.superestimada).toBe(true)
    expect(ressalvas.sem_embalagem).toBe(1)
    expect(ressalvas.sem_impostos).toBe(1)
    expect(ressalvas.sem_base).toBe(0)
    expect(ressalvas.observacoes).toContain('embalagem nao cadastrada')
    // A observação informativa de uma linha saudável não vira ressalva visual.
    expect(ressalvas.observacoes).not.toContain('ok')
  })

  it('sinaliza base incompleta como motivo de MC superestimada', () => {
    const ressalvas = ressalvasDaMargem([
      {
        embalagem_informada: true,
        impostos_informados: true,
        base_completa: false,
        cobertura_da_base_pct: '4.9344',
        observacoes: [TEXTO_BASE_INCOMPLETA],
      },
    ])

    expect(ressalvas.superestimada).toBe(true)
    expect(ressalvas.base_incompleta).toBe(true)
    expect(ressalvas.sem_base).toBe(1)
    expect(ressalvas.observacoes).toContain(TEXTO_BASE_INCOMPLETA)
  })

  it('não trata divergência de base (base_completa=true) como ressalva de erro', () => {
    const ressalvas = ressalvasDaMargem([
      {
        embalagem_informada: true,
        impostos_informados: true,
        base_completa: true,
        cobertura_da_base_pct: '132.0000',
        observacoes: [TEXTO_DIVERGENCIA],
      },
    ])

    expect(ressalvas.superestimada).toBe(false)
    expect(ressalvas.base_incompleta).toBe(false)
    expect(ressalvas.sem_base).toBe(0)
    expect(ressalvas.observacoes).toEqual([])
    expect(ressalvas.divergencias_base).toEqual([TEXTO_DIVERGENCIA])
  })

  it('não sinaliza nada quando tudo foi informado', () => {
    const ressalvas = ressalvasDaMargem([
      { embalagem_informada: true, impostos_informados: true, base_completa: true },
    ])
    expect(ressalvas.superestimada).toBe(false)
    expect(ressalvas.observacoes).toEqual([])
    expect(ressalvas.divergencias_base).toEqual([])
  })
})

describe('somaEmbalagem', () => {
  it('soma só o que está cadastrado e conta as linhas sem valor', () => {
    expect(
      somaEmbalagem([{ embalagem: '1.50' }, { embalagem: null }, { embalagem: 2 }, { embalagem: '' }]),
    ).toEqual({ total: 3.5, semValor: 2 })
  })
})

describe('rótulos', () => {
  it('traduz nível, marketplace e competência para linguagem de negócio', () => {
    expect(rotuloNivel('marketplace')).toBe('Marketplace')
    expect(rotuloMarketplace('tiktok')).toBe('TikTok Shop')
    expect(rotuloCompetencia('2026-08-01')).toBe('ago/2026')
    expect(rotuloCompetencia(null)).toBe('—')
  })

  it('mostra a cobertura da base no selo quando ela existe', () => {
    expect(
      rotuloDaBase(diagnosticoDaBase({ base_completa: false, cobertura_da_base_pct: '4.9344' })),
    ).toBe('Base incompleta (4,93% da receita declarada)')
    expect(rotuloDaBase(diagnosticoDaBase({ base_completa: true }))).toBe('')
  })
})
