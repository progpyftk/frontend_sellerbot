import { describe, expect, it } from 'vitest'

import {
  custoDoCnpj, formatCnpj, formatPct, fracaoParaCampoPct, linhasHistorico, mensagemErro, numeroDigitado,
  passosConfiguracao, payloadAliquota, payloadCusto, reaisParaCampo, regimeTemMargem, rotuloOrigemAliquota,
  rotuloOrigemCusto, rotuloRegime, validarPercentual, validarReais, payloadFracao, regimeRegular, rotuloStatusAliquota,
  varianteStatusAliquota, UFS,
} from 'src/utils/parametrosMargem'

const semValor = { origem: 'sem_valor', modo: 'simples', valor: null, registro: null }
const cnpj = (o = {}) => ({
  id: 1, cnpj: '12345678000190', razao_social: 'GRAMPOFIX', regime: 'simples',
  aliquota: { valor: '0.085000', origem: 'pgdas', sugestao_pgdas: '0.085000', registro: null },
  producao: semValor, embalagem: semValor, ...o,
})

describe('conversão % ↔ fração e números digitados (MCS-7)', () => {
  it('lê pt-BR e ponto', () => {
    expect(numeroDigitado('8,5')).toBe(8.5)
    expect(numeroDigitado('8.5')).toBe(8.5)
    expect(numeroDigitado('1.234,56')).toBe(1234.56)
    expect(numeroDigitado(' 8,5 % ')).toBe(8.5)
    expect(numeroDigitado('')).toBeNull()
    expect(numeroDigitado('abc')).toBeNull()
  })

  it('fração da API vira % no campo e no texto', () => {
    expect(fracaoParaCampoPct('0.085000')).toBe('8,5')
    expect(fracaoParaCampoPct('0.094500')).toBe('9,45')
    expect(fracaoParaCampoPct(null)).toBe('')
    expect(formatPct('0.0945')).toBe('9,45%')
    expect(formatPct(null)).toBe('—')
    expect(reaisParaCampo('1.10')).toBe('1,1')
  })

  it('valida alíquota e valor por pedido', () => {
    expect(validarPercentual('8,5')).toBeNull()
    expect(validarPercentual('')).toMatch(/Digite/)
    expect(validarPercentual('100')).toMatch(/entre/)
    expect(validarReais('1,50')).toBeNull()
    expect(validarReais('-1')).toMatch(/negativo/)
  })
})

describe('corpo dos POSTs', () => {
  it('alíquota vai em percentual, com o CNPJ', () => {
    expect(payloadAliquota(7, '8,5')).toEqual({ tipo: 'aliquota', cnpj_id: 7, percentual: 8.5 })
  })

  it('custo simples leva valor; detalhado não; sem CNPJ é o geral', () => {
    expect(payloadCusto('producao', 7, 'simples', '1,10')).toEqual({ tipo: 'producao', modo: 'simples', cnpj_id: 7, valor: 1.1 })
    expect(payloadCusto('embalagem', null, 'simples', '0,9')).toEqual({ tipo: 'embalagem', modo: 'simples', valor: 0.9 })
    expect(payloadCusto('producao', 7, 'detalhado', '1,10')).toEqual({ tipo: 'producao', modo: 'detalhado', cnpj_id: 7 })
  })
})

describe('rótulos', () => {
  it('regime e quem tem margem', () => {
    expect(rotuloRegime('simples')).toBe('Simples Nacional')
    expect(rotuloRegime(null)).toBe('Regime não declarado')
    expect(regimeTemMargem('simples')).toBe(true)
    expect(regimeTemMargem('real')).toBe(false)
  })

  it('origens', () => {
    expect(rotuloOrigemAliquota('digitada')).toBe('Digitada')
    expect(rotuloOrigemAliquota('pgdas')).toBe('Pelas PGDAS')
    expect(rotuloOrigemAliquota('')).toBe('Falta informar')
    expect(rotuloOrigemCusto('digitada')).toBe('Valor por pedido')
    expect(rotuloOrigemCusto('detalhado')).toBe('Detalhado')
    expect(rotuloOrigemCusto('sem_valor')).toBe('Não informado')
  })

  it('valor do CNPJ × valor geral', () => {
    expect(custoDoCnpj({ registro: { cnpj_id: 1 } })).toBe(true)
    expect(custoDoCnpj({ registro: { cnpj_id: null } })).toBe(false)
    expect(custoDoCnpj(semValor)).toBe(false)
  })

  it('erro da API: financeiro usa error, fiscal usa detail', () => {
    expect(mensagemErro({ response: { data: { error: 'Registros passados não mudam' } } })).toBe('Registros passados não mudam')
    expect(mensagemErro({ response: { data: { detail: 'Só o dono' } } })).toBe('Só o dono')
    expect(mensagemErro({})).toBe('Não foi possível salvar.')
  })

  it('CNPJ formatado', () => {
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90')
    expect(formatCnpj('123')).toBe('123')
  })
})

describe('passo a passo do login sem configuração', () => {
  it('sem CNPJ, o primeiro passo é cadastrar', () => {
    const r = passosConfiguracao({ cnpjs: [], geral: { producao: semValor, embalagem: semValor } })
    expect(r.atual).toBe('cnpj')
    expect(r.pronto).toBe(false)
  })

  it('CNPJ sem regime pede o regime', () => {
    expect(passosConfiguracao({ cnpjs: [cnpj({ regime: null })] }).atual).toBe('regime')
  })

  it('Simples sem alíquota pede a alíquota', () => {
    const r = passosConfiguracao({ cnpjs: [cnpj({ aliquota: { valor: null, origem: '', sugestao_pgdas: null } })] })
    expect(r.atual).toBe('aliquota')
    expect(r.pronto).toBe(false)
  })

  it('com alíquota a margem está pronta; produção e embalagem ficam opcionais', () => {
    const r = passosConfiguracao({ cnpjs: [cnpj()], geral: { producao: semValor, embalagem: semValor } })
    expect(r.pronto).toBe(true)
    expect(r.atual).toBe('producao')
  })

  it('valor geral conta como informado', () => {
    const dig = { origem: 'digitada', modo: 'simples', valor: '1.00' }
    const r = passosConfiguracao({ cnpjs: [cnpj()], geral: { producao: dig, embalagem: dig } })
    expect(r.atual).toBeNull()
  })

  it('só CNPJ fora do Simples não fica pronto', () => {
    expect(passosConfiguracao({ cnpjs: [cnpj({ regime: 'real' })] }).pronto).toBe(false)
  })
})

describe('histórico', () => {
  it('resolve o CNPJ e formata pelo tipo', () => {
    const linhas = linhasHistorico([
      { id: 1, tipo: 'aliquota', cnpj_id: 1, modo: 'simples', valor: '0.085000', vigencia_de: '2026-11-25', vigencia_ate: null, declarado_por: 'ana' },
      { id: 2, tipo: 'embalagem', cnpj_id: null, modo: 'simples', valor: '0.90', vigencia_de: '2026-11-25', vigencia_ate: '2026-11-30', declarado_por: null },
      { id: 3, tipo: 'producao', cnpj_id: 1, modo: 'detalhado', valor: null, vigencia_de: '2026-11-26', vigencia_ate: null },
    ], [cnpj()])
    expect(linhas[0]).toMatchObject({ tipo: 'Alíquota efetiva', cnpj: 'GRAMPOFIX', valor: '8,50%', de: '25/11/2026', ate: 'em vigor', quem: 'ana' })
    expect(linhas[1]).toMatchObject({ cnpj: 'Todos os CNPJs', ate: '30/11/2026', quem: '—' })
    expect(linhas[1].valor).toMatch(/0,90 por pedido/)
    expect(linhas[2].valor).toBe('Detalhado')
  })
})

describe('cadastro do regime regular (MCR-3)', () => {
  it('só Real e Presumido têm o cadastro', () => {
    expect(regimeRegular('real')).toBe(true)
    expect(regimeRegular('presumido')).toBe(true)
    expect(regimeRegular('simples')).toBe(false)
    expect(regimeRegular(null)).toBe(false)
  })
  it('frações de crédito vão em percentual', () => {
    expect(payloadFracao('icms_recuperavel', 7, '4,5')).toEqual({ tipo: 'icms_recuperavel', cnpj_id: 7, percentual: 4.5 })
  })
  it('status das alíquotas e as 27 UFs', () => {
    expect(rotuloStatusAliquota('parametro')).toMatch(/aguarda/)
    expect(varianteStatusAliquota('lei')).toBe('green')
    expect(varianteStatusAliquota('nao_verificado')).toBe('amber')
    expect(UFS).toHaveLength(27)
  })
  it('histórico mostra as frações em %', () => {
    const [l] = linhasHistorico([{ id: 1, tipo: 'credito_simples', cnpj_id: null, modo: 'simples', valor: '0.035000',
      vigencia_de: '2026-11-27', vigencia_ate: null }], [])
    expect(l.valor).toBe('3,50%')
    expect(l.tipo).toBe('Crédito de compras do Simples')
  })
})
