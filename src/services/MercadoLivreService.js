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
  bulkStock(payload) {
    return api.post('/mercadolivre/items/bulk-stock/', payload)
  },

  getPromotions(params = {}) {
    return api.get('/mercadolivre/promotions/', { params })
  },

  activatePromotions(payload) {
    return api.post('/mercadolivre/promotions/', payload)
  },

  toggleAutoActivatePromotion(recordId, active, autoMaxDiscountPct = null) {
    return api.patch(`/mercadolivre/promotions/${recordId}/auto-activate/`, {
      active,
      auto_max_discount_pct: autoMaxDiscountPct,
    })
  },

  getOrderKpis(params) {
    return api.get('/mercadolivre/orders/kpis/', { params })
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

  getDashboardToday(params = {}) {
    return api.get('/mercadolivre/dashboard/today/', { params })
  },

  // ==========================================
  // ANÁLISE DE ANÚNCIOS (Item Analytics)
  // ==========================================
  getAnalyticsItems(params) {
    return api.get('/mercadolivre/analytics/v2/items/', { params })
  },

  getAnalyticsItemsLegacy(params) {
    return api.get('/mercadolivre/analytics/items/', { params })
  },

  getItemAnalyticsOverview(itemId, params) {
    return api.get(`/mercadolivre/analytics/v2/items/${itemId}/`, { params })
  },

  getItemAnalyticsTimeline(itemId, params) {
    return api.get(`/mercadolivre/analytics/v2/items/${itemId}/timeline/`, { params })
  },

  // Endpoints legados permanecem disponíveis durante o rollout do contrato v2.
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
  getFullCoverage() {
    return api.get('/mercadolivre/market/full-coverage/')
  },
  getStockAnalysis() {
    return api.get('/mercadolivre/market/stock-analysis/')
  },
  getBuyerClassification(params) {
    return api.get('/mercadolivre/orders/buyer-classification/', { params })
  },

  // ==========================================
  // GESTAO FULL
  // ==========================================
  getFulfillmentOverview(params) {
    return api.get('/mercadolivre/fulfillment/overview/', { params })
  },
  getFulfillmentHealth(params = {}) {
    return api.get('/mercadolivre/fulfillment/health/', { params })
  },
  listFulfillmentImports(params = {}) {
    return api.get('/mercadolivre/fulfillment/imports/', { params })
  },
  uploadFulfillmentImport(payload) {
    return api.post('/mercadolivre/fulfillment/imports/', payload)
  },
  getFulfillmentImport(importId, params = {}) {
    return api.get(`/mercadolivre/fulfillment/imports/${importId}/`, { params })
  },
  previewFulfillmentDraft(payload) {
    return api.post('/mercadolivre/fulfillment/drafts/preview/', payload)
  },
  listFulfillmentDrafts(params = {}) {
    return api.get('/mercadolivre/fulfillment/drafts/', { params })
  },
  createFulfillmentDraft(payload) {
    return api.post('/mercadolivre/fulfillment/drafts/', payload)
  },
  getFulfillmentDraft(draftId) {
    return api.get(`/mercadolivre/fulfillment/drafts/${draftId}/`)
  },
  adjustFulfillmentDraftLine(draftId, lineId, payload) {
    return api.patch(`/mercadolivre/fulfillment/drafts/${draftId}/lines/${lineId}/`, payload)
  },
  reviewFulfillmentDraft(draftId) {
    return api.post(`/mercadolivre/fulfillment/drafts/${draftId}/review/`, {})
  },
  exportFulfillmentDraft(draftId) {
    return api.post(`/mercadolivre/fulfillment/drafts/${draftId}/export/`, {})
  },
  markFulfillmentDraftSubmitted(draftId, payload = {}) {
    return api.post(`/mercadolivre/fulfillment/drafts/${draftId}/mark-submitted/`, payload)
  },
  getFulfillmentRecommendations(params) {
    return api.get('/mercadolivre/fulfillment/recommendations/', { params })
  },
  getFulfillmentOpportunities(params) {
    return api.get('/mercadolivre/fulfillment/opportunities/', { params })
  },
  getFulfillmentOpportunity(itemId, params) {
    return api.get(`/mercadolivre/fulfillment/opportunities/${itemId}/`, { params })
  },
  getFulfillmentOpportunityTimeline(itemId, params) {
    return api.get(`/mercadolivre/fulfillment/opportunities/${itemId}/timeline/`, { params })
  },
  getFulfillmentPackageProfiles(params) {
    return api.get('/mercadolivre/fulfillment/package-profiles/', { params })
  },
  saveFulfillmentPackageProfile(payload) {
    return api.post('/mercadolivre/fulfillment/package-profiles/', payload)
  },
  updateFulfillmentPackageProfile(profileId, payload) {
    return api.patch(`/mercadolivre/fulfillment/package-profiles/${profileId}/`, payload)
  },
  getFulfillmentItem(itemId, params) {
    return api.get(`/mercadolivre/fulfillment/items/${itemId}/`, { params })
  },
  getFulfillmentTimeline(itemId, params) {
    return api.get(`/mercadolivre/fulfillment/items/${itemId}/timeline/`, { params })
  },
  getFulfillmentOperations(itemId, params) {
    return api.get(`/mercadolivre/fulfillment/items/${itemId}/operations/`, { params })
  },
  getFulfillmentCapacity(params) {
    return api.get('/mercadolivre/fulfillment/capacity/', { params })
  },
  saveFulfillmentCapacity(payload) {
    return api.post('/mercadolivre/fulfillment/capacity/', payload)
  },
}
