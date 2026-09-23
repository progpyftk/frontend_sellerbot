/**
 * Margem de contribuicao final sobre o FATURAMENTO LIQUIDO (net revenue).
 *
 * A regua foi corrigida no ticket FIN-20: o denominador e a receita liquida, nao o GMV
 * bruto. Dividir pelo GMV mistura imposto e tarifa com margem e infla o percentual; a
 * definicao oficial do negocio e:
 *
 *   GMV - impostos = faturamento liquido
 *   faturamento liquido - taxas - frete - embalagem - ads - CPV = margem de contribuicao
 *   MC % = MC / faturamento liquido x 100
 *
 * O percentual OFICIAL, porem, e o materializado pelo backend em
 * `GET /api/financeiro/margens/` (ver `MargemService`). Esta funcao continua existindo como
 * fallback do dashboard, onde a API de estatisticas nao expoe impostos/embalagem: o
 * `netRevenue` disponivel ali e o liquido recebido (GMV - tarifas), o proxy mais proximo
 * de faturamento liquido. O lucro informado ja pode incluir ou nao Ads; `adsCost` e
 * descontado aqui.
 */
export function calculateNetMarginPct(netRevenue, grossProfit, adsCost = 0, decimals = 2) {
  const netValue = Number(netRevenue) || 0
  if (!netValue) return null

  const profitAfterAds = (Number(grossProfit) || 0) - (Number(adsCost) || 0)
  return +(profitAfterAds / netValue * 100).toFixed(decimals)
}
