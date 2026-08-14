/**
 * Calcula a margem de contribuicao final sobre o GMV bruto.
 * O lucro informado ja pode incluir ou nao Ads; `adsCost` e descontado aqui.
 */
export function calculateNetMarginPct(gmv, grossProfit, adsCost = 0, decimals = 2) {
  const grossValue = Number(gmv) || 0
  if (!grossValue) return null

  const profitAfterAds = (Number(grossProfit) || 0) - (Number(adsCost) || 0)
  return +(profitAfterAds / grossValue * 100).toFixed(decimals)
}
