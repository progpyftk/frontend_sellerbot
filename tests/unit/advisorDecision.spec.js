// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  FLOOR_MARGIN_PCT,
  FLOOR_PROFIT_BRL,
  LEGENDARIO_RESULTADOS,
  REGRA_RESULTADOS,
  brl,
  decisionSummary,
  missingLabels,
  pct,
  resultOf,
  situationOf,
  suggestionOf,
} from 'src/utils/advisorDecision'

const baseRow = (overrides = {}) => ({
  item_id: 'MLB1',
  title: 'Ureia 25kg',
  estimable: true,
  margin_pct: 42,
  profit_unit: 20,
  below_floor: false,
  has_active_promo: true,
  health: 'alto',
  missing_inputs: [],
  ...overrides,
})

describe('advisorDecision · formatação', () => {
  it('formata BRL e porcentagem em pt-BR e trata ausência', () => {
    // pt-BR usa espaço não-separável (U+00A0) após "R$"
    expect(brl(12)).toMatch(/R\$[\s\u00A0]12,00/)
    expect(brl(null)).toBe('—')
    expect(pct(28.14)).toBe('28,1%')
    expect(pct(undefined)).toBe('—')
  })

  it('traduz os inputs ausentes para a linguagem do dono', () => {
    expect(missingLabels({ missing_inputs: ['cmv', 'shipping', 'desconhecido'] }))
      .toEqual(['CMV', 'frete', 'desconhecido'])
  })
})

describe('advisorDecision · situação (estado honesto)', () => {
  it('abaixo do piso → bloqueado com o motivo numérico explícito', () => {
    const s = situationOf(baseRow({ below_floor: true, margin_pct: 28.1, profit_unit: 11.89 }))
    expect(s.key).toBe('bloqueado_piso')
    expect(s.variant).toBe('red')
    expect(s.icon).toBe('block')
    expect(s.reason).toContain(`margem mínima de ${pct(FLOOR_MARGIN_PCT)}`)
    expect(s.reason).toContain('28,1%')
    expect(s.reason).toContain('11,89')
  })

  it('sem cálculo financeiro → sem dados, listando o que falta', () => {
    const s = situationOf(baseRow({ estimable: false, margin_pct: null, profit_unit: null, missing_inputs: ['shipping'] }))
    expect(s.key).toBe('sem_dados')
    expect(s.reason).toContain('frete')
  })

  it('parado/fraco → giro baixo (revisão de anúncio, não só desconto)', () => {
    const s = situationOf(baseRow({ health: 'parado', health_info: { units_per_week: 0 } }))
    expect(s.key).toBe('baixo_giro')
    expect(s.reason).toContain('Parado')
    expect(s.reason).toContain('revisão')
  })

  it('promo ativa saudável e anúncio sem promoção', () => {
    expect(situationOf(baseRow()).key).toBe('promo_ativa')
    expect(situationOf(baseRow({ has_active_promo: false })).key).toBe('sem_promo')
  })
})

describe('advisorDecision · sugestão da régua', () => {
  it('bloqueado pelo piso nunca sugere escrita', () => {
    const s = suggestionOf(baseRow({ below_floor: true, margin_pct: 21 }))
    expect(s.key).toBe('bloqueado')
    // O vermelho fica na coluna Situação; a sugestão não repete o alerta.
    expect(s.variant).toBe('slate')
    expect(s.detail).toContain(`lucro mínimo de ${brl(FLOOR_PROFIT_BRL)}`)
    expect(s.source).toBe('regua')
  })

  it('dupla (abaixo do mínimo + poucas vendas) pede preço E revisão (PROMO-IA-47)', () => {
    // antes "Revisar anúncio" ficava mascarado pelo alerta de piso
    const s = suggestionOf(baseRow({ below_floor: true, margin_pct: 21, health: 'parado' }))
    expect(s.key).toBe('corrigir_e_revisar')
    expect(s.label).toContain('Revisar anúncio')
    // sem promo ativa também é coorte (o caso que era só "rebase")
    expect(suggestionOf(baseRow({ has_active_promo: false, margin_pct: 24.5, health: 'fraco' })).key)
      .toBe('corrigir_e_revisar')
    // o campo novo `below_min` do backend decide sem recalcular
    expect(suggestionOf(baseRow({
      below_floor: false, below_min: true, has_active_promo: false, margin_pct: 40, health: 'fraco',
    })).key).toBe('corrigir_e_revisar')
    // acima do mínimo, parado/fraco continua indo só para revisão
    expect(suggestionOf(baseRow({ health: 'parado' })).key).toBe('revisar')
  })

  it('margem < 30% sem promo → rebase para o precificador', () => {
    const s = suggestionOf(baseRow({ has_active_promo: false, margin_pct: 24.5 }))
    expect(s.key).toBe('rebase')
    expect(s.detail).toContain('24,5%')
  })

  it('parado/fraco → revisar anúncio (regra do dono, sempre)', () => {
    expect(suggestionOf(baseRow({ health: 'fraco' })).key).toBe('revisar')
    expect(suggestionOf(baseRow({ health: 'parado' })).key).toBe('revisar')
  })

  it('giro médio: reduz desconto abaixo de 40% e mantém acima', () => {
    expect(suggestionOf(baseRow({ health: 'medio', margin_pct: 33 })).key).toBe('reduzir')
    expect(suggestionOf(baseRow({ health: 'medio', margin_pct: 44 })).key).toBe('manter')
  })

  it('giro alto → não mexer', () => {
    expect(suggestionOf(baseRow({ health: 'alto' })).key).toBe('manter')
  })

  it('sem dados → sem base para sugerir (a menos que seja parado/fraco)', () => {
    const s = suggestionOf(baseRow({ estimable: false, missing_inputs: ['cmv'] }))
    expect(s.key).toBe('sem_dados')
    expect(s.detail).toContain('CMV')
    // A revisão de anúncio não depende de margem: parado/fraco vence "sem dados".
    expect(suggestionOf(baseRow({ estimable: false, health: 'parado' })).key).toBe('revisar')
  })

  it('quando o backend expuser recomendação corrente, ela vence a régua', () => {
    const s = suggestionOf(baseRow({
      recommendation: { acao: 'aprofundar', label: 'Aprofundar desconto', detail: 'Preço alvo R$ 26,00' },
    }))
    expect(s.key).toBe('aprofundar')
    expect(s.label).toBe('Aprofundar desconto')
    expect(s.source).toBe('backend')
  })
})

describe('advisorDecision · resultado da última escrita (PROMO-IA-48)', () => {
  it('mapeia o estado real do ledger para a linguagem do dono', () => {
    expect(resultOf({ last_result: { state: 'executed_verified', at: 'x' } }).label).toBe('Confirmado')
    expect(resultOf({ last_result: { state: 'accepted_unverified' } }).label).toBe('Aguardando')
    expect(resultOf({ last_result: { state: 'failed' } }).label).toBe('Recusado')
    expect(resultOf({ last_result: { state: 'unknown' } }).label).toBe('Sem confirmação')
    // "Bloqueado (proteção)" deixa claro que o ML NÃO bloqueou o anúncio — a
    // proteção segurou a escrita, com o motivo traduzido (PROMO-IA-49).
    const b = resultOf({ last_result: { state: 'blocked', blocked_code: 'SMART_READ_ONLY' } })
    expect(b.label).toBe('Bloqueado (proteção)')
    expect(b.detail).toContain('só sinaliza, nunca escreve')
  })

  it('sem escrita no ledger não mente: vira "Sem escrita"', () => {
    expect(resultOf({ last_result: null }).key).toBe('nada')
    expect(resultOf({}).key).toBe('nada')
    // estado desconhecido do ledger não pode virar confirmação
    expect(resultOf({ last_result: { state: 'qualquer_coisa' } }).key).toBe('sem_confirmacao')
  })
})

describe('advisorDecision · resumo da página', () => {
  it('conta atenção, sugestões e bloqueios sem misturar escopos', () => {
    const rows = [
      baseRow({ below_floor: true, margin_pct: 20 }),                       // bloqueado
      baseRow({ estimable: false, missing_inputs: ['shipping'] }),          // sem dados
      baseRow({ health: 'parado' }),                                        // baixo giro + revisar
      baseRow(),                                                            // alto, promo ativa
    ]
    const d = decisionSummary(rows)
    expect(d.total).toBe(4)
    expect(d.blockedFloor).toBe(1)
    expect(d.missingData).toBe(1)
    expect(d.lowTraction).toBe(1)
    expect(d.attention).toBe(3)
    expect(d.sugestoes.bloqueado).toBe(1)
    expect(d.sugestoes.sem_dados).toBe(1)
    expect(d.sugestoes.revisar).toBe(1)
    expect(d.sugestoes.manter).toBe(1)
  })

  it('página vazia não quebra o resumo', () => {
    const d = decisionSummary([])
    expect(d.total).toBe(0)
    expect(d.attention).toBe(0)
    expect(d.sugestoes).toEqual({})
  })
})

describe('advisorDecision · régua por conta (PROMO-CFG-3)', () => {
  it('usa o piso da PRÓPRIA linha, não a constante da plataforma, para decidir rebase', () => {
    // 24% está ACIMA do piso de 15% desta conta: não deveria virar "rebase".
    const linhaComPisoBaixo = baseRow({
      has_active_promo: false, margin_pct: 24, floor_margin_pct: 15, floor_profit_brl: 8,
    })
    expect(suggestionOf(linhaComPisoBaixo).key).not.toBe('rebase')

    // a mesma margem, sem o override de conta, cai no piso da plataforma (30%) e vira rebase.
    const linhaSemOverride = baseRow({ has_active_promo: false, margin_pct: 24 })
    expect(suggestionOf(linhaSemOverride).key).toBe('rebase')
  })

  it('usa o alvo de giro médio da PRÓPRIA linha para decidir reduzir vs. manter', () => {
    const linha = baseRow({ health: 'medio', margin_pct: 22, target_medio_pct: 20 })
    expect(suggestionOf(linha).key).toBe('manter') // 22% já está acima do alvo de 20% desta conta
  })

  it('mensagem de bloqueio cita o piso resolvido da linha, não o texto fixo', () => {
    const s = situationOf(baseRow({
      below_floor: true, margin_pct: 12, profit_unit: 6, floor_margin_pct: 15, floor_profit_brl: 8,
    }))
    expect(s.reason).toContain('15,0%')
    expect(s.reason).toContain('R$')
    expect(s.reason).toContain('8,00')
  })
})

describe('advisorDecision · legenda do resultado (PROMO-IA-51)', () => {
  it('explica os 6 desfechos — e o "Bloqueado (proteção)" deixa claro que o ML não bloqueou', () => {
    expect(Object.keys(REGRA_RESULTADOS).sort()).toEqual(
      ['aguardando', 'bloqueado', 'confirmado', 'nada', 'recusado', 'sem_confirmacao'].sort(),
    )
    for (const [key, regra] of Object.entries(REGRA_RESULTADOS)) {
      expect(regra, `regra vazia para ${key}`).toBeTruthy()
    }
    // A dúvida do dono ("o que significa que foi bloqueado??"):
    expect(REGRA_RESULTADOS.bloqueado).toContain('NÃO foi bloqueado pelo ML')
    expect(REGRA_RESULTADOS.bloqueado).toContain('proteção interna')
    expect(REGRA_RESULTADOS.bloqueado).toContain('nada foi enviado ao Mercado Livre')
    // O legendarário sai pronto para a tela, com o mesmo rótulo da tabela.
    expect(LEGENDARIO_RESULTADOS).toHaveLength(6)
    expect(LEGENDARIO_RESULTADOS.map((i) => i.label)).toContain('Bloqueado (proteção)')
    for (const item of LEGENDARIO_RESULTADOS) {
      expect(item.regra, `legenda sem regra para ${item.key}`).toBeTruthy()
    }
  })
})
