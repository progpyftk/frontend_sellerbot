import { api } from 'src/boot/axios'

export default {
  // 1. LISTAGEM (Agora aceita params diretos, muito mais flexível)
  listItems(params) {
    return api.get('/mercadolivre/items/', { params })
  },

  // 2. DETALHES
  getItem(itemId) {
    return api.get(`/mercadolivre/items/${itemId}/`)
  },

  // 3. FACETS (Novo! Busca as opções reais do banco para os filtros)
  getFacets() {
    return api.get('/mercadolivre/items/facets/')
  },

  // 4. CONTA
  listAccounts() {
    return api.get('/mercadolivre/accounts/')
  },

  // 5. SYNC (Se precisar forçar atualização)
  syncAccount(accountId) {
    return api.post(`/mercadolivre/accounts/${accountId}/sync/`)
  },

  reactivateItem(itemId, quantity = 1) {
    return api.put(`/mercadolivre/items/${itemId}/reactivate/`, { quantity })
  },

  // ==========================================
  // AÇÕES EM MASSA (BULK)
  // ==========================================
  bulkPriceUpdate(payload) {
    return api.post('/mercadolivre/items/bulk-price-update/', payload)
  },
  bulkPromoDeactivate(payload) {
    return api.post('/mercadolivre/items/bulk-promo-deactivate/', payload)
  },
  bulkPromoActivate(payload) {
    return api.post('/mercadolivre/items/bulk-promo-activate/', payload)
  },
  bulkListingType(payload) {
    return api.post('/mercadolivre/items/bulk-listing-type/', payload)
  },
  bulkWholesale(payload) {
    return api.post('/mercadolivre/items/bulk-wholesale/', payload)
  },
  bulkExactPrice(payload) {
    return api.post('/mercadolivre/items/bulk-exact-price/', payload)
  },

  getPromotions() {
    return api.get('/mercadolivre/promotions/')
  },

  activatePromotions(payload) {
    return api.post('/mercadolivre/promotions/', payload)
  },

  activateAllPromotions(payload) {
    return api.post('/mercadolivre/promotions/activate-all/', payload)
  },

  // ==========================================
  // VENDAS (ORDERS)
  // ==========================================
  listOrders(params) {
    return api.get('/mercadolivre/orders/', { params })
  },

  getOrder(orderId) {
    return api.get(`/mercadolivre/orders/${orderId}/`)
  },

  getOrderFacets() {
    // Caso você crie um facet para orders no backend futuramente.
    // Se não tiver, pode comentar essa linha e usar os dados estáticos no front.
    return api.get('/mercadolivre/orders/facets/')
  },

  getOrderTodaySummary() {
    return api.get('/mercadolivre/orders/today-summary/')
  },

  // ==========================================
  // PUBLICIDADE (ADS)
  // ==========================================
  getAdsOverview(params) {
    return api.get('/mercadolivre/ads/overview/', { params })
  },

  getAdsDaily(params) {
    return api.get('/mercadolivre/ads/daily/', { params })
  },

  getCampaignAds(campaignId) {
    return api.get(`/mercadolivre/ads/campaigns/${campaignId}/ads/`)
  },

  getAdsItems(params) {
    return api.get('/mercadolivre/ads/items/', { params })
  },

  // ==========================================
  // DASHBOARD (DailySummary pré-computado)
  // ==========================================
  getDashboardDaily(params) {
    return api.get('/mercadolivre/dashboard/daily/', { params })
  },

  computeDashboard(payload) {
    return api.post('/mercadolivre/dashboard/compute/', payload)
  },

  getDashboardOperation(params) {
    return api.get('/mercadolivre/dashboard/operation/', { params })
  },

  getDashboardToday() {
    return api.get('/mercadolivre/dashboard/today/')
  },

  // ==========================================
  // ANÁLISE DE ANÚNCIOS (Item Analytics)
  // ==========================================
  getAnalyticsItems(params) {
    return api.get('/mercadolivre/analytics/items/', { params })
  },

  getItemTimelineChart(itemId, params) {
    return api.get(`/mercadolivre/analytics/items/${itemId}/chart/`, { params })
  },

  getItemCausalAnalysis(itemId, params) {
    return api.get(`/mercadolivre/analytics/items/${itemId}/causal/`, { params })
  },

  // --- Inteligência de Mercado (Sprint B) ---
  getMarketTrends(params) {
    return api.get('/mercadolivre/market/trends/', { params })
  },
  getMarketHighlights(params) {
    return api.get('/mercadolivre/market/highlights/', { params })
  },
  getMarketNiche(params) {
    return api.get('/mercadolivre/market/niche/', { params })
  },
}
