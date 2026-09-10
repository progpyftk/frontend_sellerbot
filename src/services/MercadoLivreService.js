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
  // PROMOÇÕES DO ANÚNCIO
  // ==========================================
  // Lidas ao vivo do Mercado Livre (cache de 60s no backend; refresh=true pula).
  getItemPromotions(itemId, params = {}) {
    return api.get(`/mercadolivre/items/${itemId}/promotions/`, { params })
  },

  // payload: { all: true } ou
  // { promotions: [{ promotion_type, promotion_id, offer_id }] }
  // Responde 200 quando tudo saiu e 207 quando alguma promoção resistiu —
  // "results" traz o motivo por promoção.
  removeItemPromotions(itemId, payload) {
    return api.post(`/mercadolivre/items/${itemId}/promotions/remove/`, payload)
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
  getPendingPromotionRemovals(itemIds) {
    return api.get('/mercadolivre/items/pending-promotion-removals/', {
      params: { item_ids: itemIds.join(',') }
    })
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
  // PROMOÇÕES → POR ANÚNCIOS (visão nova — PROMO-11/PROMO-12)
  // ==========================================
  // Namespace próprio e isolado: não compartilha rota, payload nem estado
  // com o fluxo legado de `/mercadolivre/promotions/` acima. Somente estes
  // dois endpoints são consumidos pela tela redesenhada.
  getPromotionsAds(params = {}) {
    return api.get('/mercadolivre/promotions-ads/', { params })
  },

  // payload: { confirmed: true, max_discount_pct, fixed_discount_pct?, candidates: [...] }
  // resposta: { success, enqueued, blocked, enqueued_count }
  activatePromotionsAds(payload) {
    return api.post('/mercadolivre/promotions-ads/activate/', payload)
  },

  // payload: { confirmed: true, candidates: [{account_id, item_id, promotion_id, promotion_type}] }
  // resposta: { success, queued, blocked, queued_count } — remoção assíncrona (~min)
  removePromotionsAds(payload) {
    return api.post('/mercadolivre/promotions-ads/remove/', payload)
  },

  // payload: { confirmed: true, account_id, item_id, promotion_type, discount_pct }
  // resposta: { success, deal_price, old_price, ... } — só PRICE_DISCOUNT/DOD.
  // Síncrona e demorada (~10-20s): o ML não tem "update", o backend remove a
  // promoção ativa e reativa com o novo % — pode levar alguns retries.
  editActivePromotionAdDiscount(payload) {
    return api.post('/mercadolivre/promotions-ads/edit-active/', payload)
  },

  // ==========================================
  // ASSISTENTE DE PROMOÇÕES (PROMO-IA-2)
  // ==========================================
  // Painel de acompanhamento — somente leitura. Junta o log de decisões do
  // assistente (recomendação/ação) com o retrato diário dos anúncios.
  // params: { days?, limit?, account_id? }
  getPromotionsAdvisor(params = {}) {
    return api.get('/mercadolivre/promotions-advisor/', { params })
  },

  // ==========================================
  // REVISÃO SEO — PAINEL DE DECISÃO SOB DEMANDA (REV-4/REV-5) — read-only
  // ==========================================
  // Botão "Gerar lote de hoje": roda o audit ao vivo dos anúncios parado/fraco
  // ativos e popula a fila com a proposta de revisão por anúncio. NÃO escreve no
  // Mercado Livre e NÃO chama LLM. body: { limit? (padrão 30), account_ids? }
  runSeoReviewBatch(payload = {}) {
    return api.post('/mercadolivre/seo-review/run/', payload)
  },

  // Fila da revisão SEO — 1 linha = 1 anúncio, com a proposta (`proposal`) por
  // campo (atual → proposto, evidência, confiança, classe). params: { status?, limit? }
  getSeoReviewQueue(params = {}) {
    return api.get('/mercadolivre/seo-review/queue/', { params })
  },

  // ==========================================
  // ACOMPANHAMENTO POR ANÚNCIO (PROMO-15) — read-only
  // ==========================================
  // Tabela 1 linha = 1 anúncio, TODOS os anúncios das contas (com e sem
  // promoção): vendas 30d, promo ativa + datas, margem/lucro na venda atual,
  // origem (assistente/ML) e alerta de piso. Lista 100% do banco (snapshot
  // `PromotionAdSnapshot`); sem escrita — ativar/remover segue na tela de
  // operação. params: { account_id?, q?, origem? (assistente|ml|sem_promo),
  // has_promo?, health?, below_floor?, min_margin_pct?, max_margin_pct?,
  // min_discount_pct?, min_sales_30d?, sort?, page?, page_size? }
  getPromoOverview(params = {}) {
    return api.get('/mercadolivre/promo-overview/', { params })
  },

  // Expande UMA linha da tabela de acompanhamento: promoções ao vivo (a única
  // chamada ao ML da visão), timeline do assistente e retrato do anúncio.
  getPromoOverviewDetail(itemId) {
    return api.get(`/mercadolivre/promo-overview/${itemId}/`)
  },

  // Política da automação do assistente (PROMO-IA-14): o GET devolve o bloco
  // `automation` e o PATCH altera UMA conta — auto_write, wave_size,
  // paused/pause_reason e canary_approved (aval da primeira onda). Nunca escreve
  // no Mercado Livre: só guarda a decisão do dono.
  getAdvisorPolicy() {
    return api.get('/mercadolivre/promotions-advisor/policy/')
  },

  patchAdvisorPolicy(payload) {
    return api.patch('/mercadolivre/promotions-advisor/policy/', payload)
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
  listFulfillmentShipmentPlans(params = {}) {
    return api.get('/mercadolivre/fulfillment/shipment-plans/', { params })
  },
  createFulfillmentShipmentPlan(payload) {
    return api.post('/mercadolivre/fulfillment/shipment-plans/', payload)
  },
  getFulfillmentShipmentPlan(planId) {
    return api.get(`/mercadolivre/fulfillment/shipment-plans/${planId}/`)
  },
  getFulfillmentShipmentPlanLines(planId, params = {}) {
    return api.get(`/mercadolivre/fulfillment/shipment-plans/${planId}/lines/`, { params })
  },
  adjustFulfillmentShipmentPlanLine(planId, lineId, payload) {
    return api.patch(`/mercadolivre/fulfillment/shipment-plans/${planId}/lines/${lineId}/`, payload)
  },
  reviewFulfillmentShipmentPlan(planId) {
    return api.post(`/mercadolivre/fulfillment/shipment-plans/${planId}/review/`, {})
  },
  exportFulfillmentShipmentPlan(planId) {
    return api.post(`/mercadolivre/fulfillment/shipment-plans/${planId}/export/`, {})
  },
  markFulfillmentShipmentPlanSubmitted(planId, payload = {}) {
    return api.post(`/mercadolivre/fulfillment/shipment-plans/${planId}/mark-submitted/`, payload)
  },
  createFulfillmentOutOfFullJob(payload) {
    return api.post('/mercadolivre/fulfillment/out-of-full/jobs/', payload)
  },
  listFulfillmentOutOfFullSuggestions(params = {}) {
    return api.get('/mercadolivre/fulfillment/out-of-full/suggestions/', { params })
  },
  getFulfillmentOutOfFullSuggestion(suggestionId, params = {}) {
    return api.get(`/mercadolivre/fulfillment/out-of-full/suggestions/${suggestionId}/`, { params })
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
