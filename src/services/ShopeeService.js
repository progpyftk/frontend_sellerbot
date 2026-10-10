import { api } from 'src/boot/axios'

export default {
  listAccounts() {
    return api.get('/shopee/accounts/')
  },

  getAuthUrl(params) {
    // params: { partner_id, partner_key, redirect_url }
    return api.get('/shopee/accounts/auth_url/', { params })
  },

  getReconnectAuthUrl(accountId) {
    return api.post(`/shopee/accounts/${accountId}/reconnect-auth-url/`)
  },

  callback(data) {
    // Conta nova: partner_id/partner_key. Reconexão: account_id; a chave fica no backend.
    return api.post('/shopee/accounts/callback/', data)
  },

  refreshToken(accountId) {
    return api.post(`/shopee/accounts/${accountId}/refresh_token/`)
  },

  syncOrders(accountId, payload = {}) {
    return api.post(`/shopee/accounts/${accountId}/sync_orders/`, payload)
  },

  syncItems(accountId) {
    return api.post(`/shopee/accounts/${accountId}/sync_items/`)
  },

  syncEscrow(accountId, payload = {}) {
    return api.post(`/shopee/accounts/${accountId}/sync_escrow/`, payload)
  },

  deleteAccount(accountId) {
    return api.delete(`/shopee/accounts/${accountId}/`)
  },

  // Orders
  listOrders(params = {}) {
    return api.get('/shopee/orders/', { params })
  },

  getOrder(orderId) {
    return api.get(`/shopee/orders/${orderId}/`)
  },

  getOrderTracking(orderId) {
    return api.get(`/shopee/orders/${orderId}/tracking/`)
  },

  getOrderTodayStats() {
    return api.get('/shopee/orders/today_stats/')
  },

  // Items list
  listItems(params = {}) {
    return api.get('/shopee/items/', { params })
  },

  // Dashboard
  getTodayStats(params = {}) {
    return api.get('/shopee/orders/today_stats/', { params })
  },

  getDashboardStats(params = {}) {
    return api.get('/shopee/orders/dashboard_stats/', { params })
  },

  // Ads
  getAdsOverview(params = {}) {
    return api.get('/shopee/ads/overview/', { params })
  },

  getAdsDaily(params = {}) {
    return api.get('/shopee/ads/daily/', { params })
  },

  // Discounts
  getDiscounts(params = {}) {
    return api.get('/shopee/discounts/', { params })
  },
  getDiscountDetail(discountId, params = {}) {
    return api.get(`/shopee/discounts/${discountId}/`, { params })
  },
  createDiscount(data) {
    return api.post('/shopee/discounts/create/', data)
  },
  endDiscount(discountId, data) {
    return api.post(`/shopee/discounts/${discountId}/end/`, data)
  },
  deleteDiscount(discountId, data) {
    return api.delete(`/shopee/discounts/${discountId}/delete/`, { data })
  },
  // Processamento em lote (segundo plano) — espelha o ML
  bulkDiscounts(items) {
    return api.post('/shopee/discounts/bulk/', { items })
  },
  getDiscountTasks() {
    return api.get('/shopee/discounts/tasks/')
  },
  addDiscountItems(discountId, data) {
    return api.post(`/shopee/discounts/${discountId}/items/`, data)
  },

  // Flash Sale (Oferta Relâmpago) da loja
  getFlashSales(params = {}) {
    return api.get('/shopee/flash-sales/', { params })
  },
  getFlashSaleSlots(params = {}) {
    return api.get('/shopee/flash-sales/slots/', { params })
  },
  suggestFlashSaleItem(params = {}) {
    return api.get('/shopee/flash-sales/suggest/', { params })
  },
  getFlashSale(flashSaleId, params = {}) {
    return api.get(`/shopee/flash-sales/${flashSaleId}/`, { params })
  },
  createFlashSale(data) {
    return api.post('/shopee/flash-sales/create/', data)
  },
  addFlashSaleItems(flashSaleId, data) {
    return api.post(`/shopee/flash-sales/${flashSaleId}/items/`, data)
  },
  setFlashSaleStatus(flashSaleId, data) {
    return api.post(`/shopee/flash-sales/${flashSaleId}/status/`, data)
  },
  deleteFlashSale(flashSaleId, params = {}) {
    return api.delete(`/shopee/flash-sales/${flashSaleId}/`, { params })
  },

  getFlashSaleAuto(params = {}) {
    return api.get('/shopee/flash-sales/auto/', { params })
  },
  saveFlashSaleAuto(data) {
    return api.patch('/shopee/flash-sales/auto/', data)
  },
  runFlashSaleAuto(data) {
    return api.post('/shopee/flash-sales/auto/', data)
  },

  // Vouchers (Cupons)
  getVouchers(params = {}) {
    return api.get('/shopee/vouchers/', { params })
  },
  getVoucher(voucherId, params = {}) {
    return api.get(`/shopee/vouchers/${voucherId}/`, { params })
  },
  createVoucher(data) {
    return api.post('/shopee/vouchers/create/', data)
  },
  endVoucher(voucherId, data) {
    return api.post(`/shopee/vouchers/${voucherId}/end/`, data)
  },
  deleteVoucher(voucherId, data) {
    return api.delete(`/shopee/vouchers/${voucherId}/delete/`, { data })
  },

  // Cupons — renovação automática (FB-27)
  getVoucherAutoRenews() {
    return api.get('/shopee/vouchers/auto-renew/')
  },
  createVoucherAutoRenew(data) {
    return api.post('/shopee/vouchers/auto-renew/create/', data)
  },
  toggleVoucherAutoRenew(templateId, active) {
    return api.patch(`/shopee/vouchers/auto-renew/${templateId}/toggle/`, { active })
  },
}
