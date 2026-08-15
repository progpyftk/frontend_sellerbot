export function isEscrowReal(order) {
  return order?.escrow_sync_status === 'synced'
    || (order?.escrow_synced === true && order?.escrow_amount != null)
}

export function revenueBasisLabel(data) {
  const basis = data?.revenue_basis || data?.faturamento_note
  return {
    escrow: 'repasse real (escrow)',
    mixed: 'período misto: escrow + estimativa',
    misto: 'período misto: escrow + estimativa',
    estimated: 'receita estimada',
  }[basis] || 'base financeira não informada'
}

export function orderRevenue(order) {
  if (isEscrowReal(order)) return Number(order.escrow_amount || 0)
  return Number(order.total_amount || 0) - Number(order.shipping_fee || 0)
}
