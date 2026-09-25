import { describe, expect, it } from 'vitest'

import {
  linhasDaConferencia,
  linhasDaShopee,
  linhasDoMl,
  linhasDoTiktok,
  margemSobreLiquida,
  periodoParaDatas,
  totaisDaConferencia,
  totaisPorMarketplace,
} from 'src/utils/marketplaceConferencia'

describe('periodoParaDatas', () => {
  it('vira o primeiro e o último dia do mês (formato do dashboard)', () => {
    expect(periodoParaDatas({ de: '2026-08', ate: '2026-08' })).toEqual({
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    })
    expect(periodoParaDatas({ de: '2026-02', ate: '2026-02' })).toEqual({
      date_from: '2026-02-01',
      date_to: '2026-02-28',
    })
  })

  it('aceita uma faixa de meses e aceita o formato com dia', () => {
    expect(periodoParaDatas({ de: '2026-07-15', ate: '2026-08' })).toEqual({
      date_from: '2026-07-01',
      date_to: '2026-08-31',
    })
  })

  it('sem período devolve vazio — o backend usa o padrão dele', () => {
    expect(periodoParaDatas({})).toEqual({ date_from: '', date_to: '' })
    expect(periodoParaDatas({ de: 'ontem' })).toEqual({ date_from: '', date_to: '' })
  })
})

describe('margemSobreLiquida', () => {
  it('divide pela receita líquida (régua do FIN-20), não pelo GMV', () => {
    expect(margemSobreLiquida(40, 200)).toBe(20)
    expect(margemSobreLiquida('12.5', '50')).toBe(25)
  })

  it('base zero ou margem ausente devolve null (ausência não é 0 %)', () => {
    expect(margemSobreLiquida(10, 0)).toBeNull()
    expect(margemSobreLiquida(null, 100)).toBeNull()
    expect(margemSobreLiquida('abc', 100)).toBeNull()
  })
})

describe('linhasDoMl', () => {
  it('usa as contas do payload com as colunas do dashboard', () => {
    const linhas = linhasDoMl({
      accounts: [
        {
          account_id: 'MOGIVITTA',
          account_nickname: 'MogiVitta',
          gmv: 1000,
          total_fees: 150,
          net_revenue: 850,
          cmv_total: 400,
          gross_profit: 450,
          ads_cost: 50,
          lucro_liquido: 400,
        },
      ],
    })
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      marketplace: 'ml',
      conta: 'MogiVitta',
      gmv: 1000,
      taxas: 150,
      liquida: 850,
      cmv: 400,
      mcAntes: 450,
      ads: 50,
      mcDepois: 400,
    })
    expect(linhas[0].mcPct).toBe(47.06)
  })

  it('payload vazio não quebra', () => {
    expect(linhasDoMl()).toEqual([])
  })
})

describe('linhasDaShopee', () => {
  it('deduz CMV e taxas como o dashboard já apresenta', () => {
    const linhas = linhasDaShopee({
      by_account: [
        { account_id: 1, shop_name: 'Dose', gmv: 500, net_revenue: 420, gross_profit: 300, ads_cost: 20, lucro_liquido: 280 },
      ],
    })
    expect(linhas[0]).toMatchObject({
      marketplace: 'shopee',
      conta: 'Dose',
      taxas: 80,
      liquida: 420,
      cmv: 120,
      mcAntes: 300,
      ads: 20,
      mcDepois: 280,
    })
  })
})

describe('linhasDoTiktok', () => {
  it('usa by_account quando existe', () => {
    const linhas = linhasDoTiktok({ by_account: [{ account_id: 9, shop_name: 'TK', net_revenue: 100, gross_profit: 40 }] })
    expect(linhas).toHaveLength(1)
    expect(linhas[0].conta).toBe('TK')
    expect(linhas[0].mcDepois).toBe(40)
  })

  it('sem by_account usa o total do payload como uma linha', () => {
    const linhas = linhasDoTiktok({ net_revenue: 100, gross_profit: 40 })
    expect(linhas).toHaveLength(1)
    expect(linhas[0].marketplace).toBe('tiktokshop')
  })

  it('sem payload devolve vazio', () => {
    expect(linhasDoTiktok(null)).toEqual([])
  })
})

describe('linhasDaConferencia e totais', () => {
  const ML = { accounts: [{ account_id: 'A', account_nickname: 'A', gmv: 100, total_fees: 10, net_revenue: 90, cmv_total: 30, gross_profit: 60, ads_cost: 10, lucro_liquido: 50 }] }
  const SH = { by_account: [{ account_id: 1, shop_name: 'B', gmv: 200, net_revenue: 180, gross_profit: 100, ads_cost: 0, lucro_liquido: 100 }] }

  it('junta ML → Shopee → TikTok', () => {
    const linhas = linhasDaConferencia({ ml: ML, shopee: SH })
    expect(linhas.map((l) => l.marketplace)).toEqual(['ml', 'shopee'])
  })

  it('soma só o que existe — campo ausente fica null, nunca zero', () => {
    const linhas = linhasDaConferencia({ ml: ML, shopee: SH })
    const totais = totaisDaConferencia(linhas)
    expect(totais.gmv).toBe(300)
    expect(totais.mcDepois).toBe(150)
    expect(totais.cmv).toBe(110)  // ML 30 + Shopee (180 - 100)
    expect(totais.mcPct).toBe(55.56)
  })

  it('lista vazia não inventa zero', () => {
    const totais = totaisDaConferencia([])
    expect(totais.gmv).toBeNull()
    expect(totais.mcDepois).toBeNull()
    expect(totais.mcPct).toBeNull()
  })

  it('agrupa os totais por marketplace', () => {
    const canais = totaisPorMarketplace(linhasDaConferencia({ ml: ML, shopee: SH }))
    expect(canais.map((c) => c.marketplace).sort()).toEqual(['ml', 'shopee'])
    expect(canais.find((c) => c.marketplace === 'ml').mcDepois).toBe(50)
  })
})
