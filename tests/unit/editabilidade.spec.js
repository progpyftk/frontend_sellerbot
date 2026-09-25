import { describe, expect, it } from 'vitest'

import {
  ORIGENS,
  motivoNaoEditavel,
  origemDerivada,
  origemInfo,
  podeEditar,
  rotuloOrigem,
} from 'src/utils/editabilidade'

describe('origemInfo', () => {
  it('traduz a origem do backend para rótulo e variante', () => {
    expect(origemInfo('nfe')).toMatchObject({ rotulo: 'NF-e', derivada: true })
    expect(origemInfo('manual')).toMatchObject({ rotulo: 'Manual', derivada: false })
  })

  it('aceita caixa alta e espaços', () => {
    expect(origemInfo(' NFSe ')).toMatchObject({ rotulo: 'NFS-e' })
  })

  it('origem vazia ou desconhecida devolve null', () => {
    expect(origemInfo('')).toBeNull()
    expect(origemInfo(null)).toBeNull()
    expect(origemInfo('planilha_do_contador')).toBeNull()
  })

  it('cobre todas as origens do livro contábil', () => {
    // Vocabulário de `JournalEntry.ORIGENS` (app_financeiro/models_contabeis.py).
    const doLivro = [
      'nfe',
      'cte',
      'nfse',
      'ads',
      'pedido',
      'folha',
      'banco',
      'ativo',
      'depreciacao',
      'das',
      'manual',
    ]
    doLivro.forEach((origem) => expect(ORIGENS[origem], origem).toBeTruthy())
  })
})

describe('origemDerivada', () => {
  it('documento e sistema são derivados', () => {
    ;['nfe', 'cte', 'nfse', 'ads', 'banco', 'das', 'depreciacao'].forEach((origem) => {
      expect(origemDerivada(origem), origem).toBe(true)
    })
  })

  it('manual e planilha não são derivados', () => {
    expect(origemDerivada('manual')).toBe(false)
    expect(origemDerivada('planilha')).toBe(false)
  })

  it('origem desconhecida conta como derivada (o padrão é não editar)', () => {
    expect(origemDerivada('planilha_do_contador')).toBe(true)
    expect(origemDerivada('')).toBe(true)
    expect(origemDerivada(null)).toBe(true)
  })
})

describe('podeEditar', () => {
  it('edita só quando o campo é nosso e a origem não é derivada', () => {
    expect(podeEditar({ editavel: true, origem: 'manual' })).toBe(true)
    expect(podeEditar({ editavel: true, origem: 'planilha' })).toBe(true)
  })

  it('não edita o que veio de documento, mesmo marcado como editável', () => {
    expect(podeEditar({ editavel: true, origem: 'nfe' })).toBe(false)
    expect(podeEditar({ editavel: true, origem: 'das' })).toBe(false)
    expect(podeEditar({ editavel: true, origem: 'banco' })).toBe(false)
  })

  it('sem a marca de editável não edita, mesmo sendo nosso', () => {
    expect(podeEditar({ editavel: false, origem: 'manual' })).toBe(false)
    expect(podeEditar({})).toBe(false)
  })

  it('sem origem informada não edita', () => {
    expect(podeEditar({ editavel: true })).toBe(false)
  })
})

describe('motivoNaoEditavel', () => {
  it('explica a origem derivada', () => {
    expect(motivoNaoEditavel('nfe')).toContain('NF-e')
    expect(motivoNaoEditavel('nfe')).toContain('não se edita')
  })

  it('não há motivo quando a célula é nossa', () => {
    expect(motivoNaoEditavel('manual')).toBe('')
  })

  it('origem desconhecida explica que a tela não sabe de onde veio', () => {
    expect(motivoNaoEditavel('sei_la')).toContain('não sabe de onde veio')
  })
})

describe('rotuloOrigem', () => {
  it('devolve o rótulo curto ou —', () => {
    expect(rotuloOrigem('nfe')).toBe('NF-e')
    expect(rotuloOrigem('sei_la')).toBe('—')
  })
})
