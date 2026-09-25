import { describe, expect, it } from 'vitest'

import {
  cascataDoRecorte,
  diagnosticoDaBase,
  diasSemMovimento,
  granularidadePadrao,
  nivelDoRecorte,
  parametrosDaMargem,
  ressalvasDaMargem,
  rotuloCompetencia,
  rotuloDaBase,
  rotuloDia,
  rotuloDoProduto,
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Aba de Margem de Contribuição do módulo (ticket `DRE-23`).
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe('nivelDoRecorte', () => {
  it('sem filtro soma o grupo por CNPJ; com empresa, o canal; com canal, o SKU', () => {
    expect(nivelDoRecorte({})).toBe('cnpj')
    expect(nivelDoRecorte({ cnpj: '41641514000103' })).toBe('marketplace')
    expect(nivelDoRecorte({ marketplace: 'ml' })).toBe('marketplace')
    expect(nivelDoRecorte({ cnpj: '41641514000103', marketplace: 'ml' })).toBe('sku')
  })

  it('o produto escolhido sempre resume no nível do SKU', () => {
    expect(nivelDoRecorte({ sku: 'SKU-A' })).toBe('sku')
    expect(nivelDoRecorte({ cnpj: 'x', marketplace: 'ml', sku: 'SKU-A' })).toBe('sku')
  })

  it('a conta da empresa por id vale como CNPJ escolhido', () => {
    expect(nivelDoRecorte({ fiscal_account: 7 })).toBe('marketplace')
  })
})

describe('rotuloDoProduto', () => {
  it('mostra nome e SKU quando há nome, e só o SKU quando não há', () => {
    expect(rotuloDoProduto({ sku: 'SKU-A', nome: 'Substrato 4kg' })).toBe('Substrato 4kg (SKU-A)')
    expect(rotuloDoProduto({ sku: 'SKU-A', nome: '' })).toBe('SKU-A')
    expect(rotuloDoProduto({ sku: 'SKU-A' })).toBe('SKU-A')
    expect(rotuloDoProduto({})).toBe('—')
  })
})

describe('cascataDoRecorte', () => {
  const RESUMO = {
    gmv: '10000.00',
    impostos: '1000.00',
    faturamento_liquido: '9000.00',
    taxas: '1200.00',
    frete: '300.00',
    embalagem: '100.00',
    ads: '200.00',
    cpv: '4000.00',
    mc: '3200.00',
    embalagem_informada: true,
    linhas_sem_embalagem: 0,
  }

  it('monta a cascata do dono na ordem, com a MC como destaque', () => {
    const linhas = cascataDoRecorte(RESUMO)
    expect(linhas.map((l) => l.chave)).toEqual([
      'gmv',
      'impostos',
      'faturamento_liquido',
      'taxas',
      'frete',
      'embalagem',
      'ads',
      'cpv',
      'mc',
    ])
    expect(linhas.find((l) => l.chave === 'mc').tipo).toBe('destaque')
    expect(linhas.find((l) => l.chave === 'faturamento_liquido').tipo).toBe('subtotal')
    expect(linhas.find((l) => l.chave === 'embalagem').valor).toBe('100.00')
  })

  it('campo ausente vira null — a tela mostra — e nunca zero', () => {
    const linhas = cascataDoRecorte({ gmv: '10.00' })
    const porChave = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]))
    expect(porChave.gmv).toBe('10.00')
    expect(porChave.embalagem).toBeNull()
    expect(porChave.mc).toBeNull()
  })

  it('marca a embalagem quando parte do recorte está sem o custo', () => {
    const linhas = cascataDoRecorte({ ...RESUMO, embalagem_informada: false, linhas_sem_embalagem: 3 })
    const embalagem = linhas.find((l) => l.chave === 'embalagem')
    expect(embalagem.sem_custo).toBe(true)
    expect(embalagem.linhas_sem_custo).toBe(3)
    expect(embalagem.rotulo).toContain('não cadastrado')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Granularidade mês | dia da aba de margem (ticket `DRE-24`).
// ─────────────────────────────────────────────────────────────────────────────────────────────

describe('granularidadePadrao', () => {
  it('um único dia liga a granularidade dia — é a pergunta do dono', () => {
    expect(granularidadePadrao('2026-08-05', '2026-08-05')).toBe('dia')
  })

  it('intervalo maior (ou vazio) fica no mês', () => {
    expect(granularidadePadrao('2026-08-01', '2026-08-31')).toBe('mes')
    expect(granularidadePadrao('2026-08-01', '2026-09-01')).toBe('mes')
    expect(granularidadePadrao('', '')).toBe('mes')
    expect(granularidadePadrao('2026-08-05', '')).toBe('mes')
  })
})

describe('rotuloDia', () => {
  it('mostra o dia no formato do dono', () => {
    expect(rotuloDia('2026-08-05')).toBe('05/08/2026')
    expect(rotuloDia('')).toBe('—')
    expect(rotuloDia('qualquer')).toBe('qualquer')
  })
})

describe('diasSemMovimento', () => {
  it('conta os dias do intervalo que não têm linha na série', () => {
    // Agosto tem 31 dias; a série só traz 3 (dois com venda e um com Ads).
    const dias = [{ dia: '2026-08-10' }, { dia: '2026-08-20' }, { dia: '2026-08-25' }]
    expect(diasSemMovimento(dias, '2026-08-01', '2026-08-31')).toBe(28)
    expect(diasSemMovimento(dias, '2026-08-10', '2026-08-10')).toBe(0)
  })

  it('sem intervalo válido não inventa contagem', () => {
    expect(diasSemMovimento([], '', '')).toBeNull()
    expect(diasSemMovimento([], '2026-08-31', '2026-08-01')).toBeNull()
  })
})
