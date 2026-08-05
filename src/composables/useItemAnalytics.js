import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MercadoLivreService from 'src/services/MercadoLivreService'
import {
  normalizeCausalResponse,
  normalizeItem,
  normalizeListResponse,
  normalizeTimelineResponse,
  queryValue,
  ANALYTICS_MODES,
} from 'src/utils/itemAnalytics'

const DEFAULTS = {
  days: 30,
  search: '',
  account: '',
  status: '',
  logistic_type: '',
  is_full: '',
  inventory_status: '',
  stock_status: '',
  sort: 'last_synced',
  mode: 'traffic',
  page: 1,
}

const requestError = (error, fallback) => error?.response?.data?.detail || error?.response?.data?.error || fallback

export function useItemAnalytics() {
  const route = useRoute()
  const router = useRouter()
  const filters = reactive({ ...DEFAULTS })
  const items = ref([])
  const pagination = ref({ page: 1, page_size: 25, total: 0, pages: 1 })
  const accounts = ref([])
  const selectedItemId = ref('')
  const overview = ref(null)
  const timeline = ref(null)
  const causal = ref(null)
  const errors = reactive({ list: null, overview: null, timeline: null, causal: null })
  const loading = reactive({ list: false, overview: false, timeline: false, causal: false })
  const mobileListOpen = ref(false)
  let listSequence = 0
  let detailSequence = 0
  let searchTimer

  const query = computed(() => ({
    days: filters.days,
    search: filters.search || undefined,
    account: filters.account || undefined,
    status: filters.status || undefined,
    logistic_type: filters.logistic_type || undefined,
    is_full: filters.is_full || undefined,
    inventory_status: filters.inventory_status || undefined,
    stock_status: filters.stock_status || undefined,
    sort: filters.sort,
    page: filters.page,
    page_size: 25,
  }))

  const selectedItem = computed(() => items.value.find((item) => item.item_id === selectedItemId.value) || overview.value)
  function hydrateFromRoute() {
    Object.keys(DEFAULTS).forEach((key) => {
      const value = queryValue(route.query[key], DEFAULTS[key])
      if (key === 'days' || key === 'page') filters[key] = Math.max(1, Number(value) || DEFAULTS[key])
      else filters[key] = value
    })
    if (!ANALYTICS_MODES.includes(filters.mode)) filters.mode = DEFAULTS.mode
    selectedItemId.value = queryValue(route.query.item)
  }

  function syncRoute() {
    const nextQuery = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== DEFAULTS[key] && value !== '') nextQuery[key] = value
    })
    if (selectedItemId.value) nextQuery.item = selectedItemId.value
    router.replace({ query: nextQuery })
  }

  async function loadAccounts() {
    try {
      const response = await MercadoLivreService.listAccounts()
      accounts.value = response.data?.accounts || response.data?.results || response.data || []
    } catch (error) {
      // Filtros continuam utilizáveis mesmo se a lista de contas estiver indisponível.
      accounts.value = []
    }
  }

  async function loadItems({ preserveSelection = true } = {}) {
    const sequence = ++listSequence
    loading.list = true
    errors.list = null
    try {
      let response
      try {
        response = await MercadoLivreService.getAnalyticsItems(query.value)
      } catch {
        response = await MercadoLivreService.getAnalyticsItemsLegacy(query.value)
      }
      if (sequence !== listSequence) return
      const normalized = normalizeListResponse(response.data)
      items.value = normalized.items
      pagination.value = normalized.pagination
      if (preserveSelection && selectedItemId.value && normalized.items.some((item) => item.item_id === selectedItemId.value)) return
      const routeItem = selectedItemId.value && normalized.items.some((item) => item.item_id === selectedItemId.value) ? selectedItemId.value : ''
      if (routeItem) await selectItem(routeItem, false)
      else if (!selectedItemId.value && normalized.items[0]) await selectItem(normalized.items[0].item_id)
      else if (selectedItemId.value && !normalized.items.some((item) => item.item_id === selectedItemId.value)) clearSelection(true)
    } catch (error) {
      if (sequence === listSequence) {
        errors.list = requestError(error, 'Não foi possível carregar os anúncios.')
        items.value = []
      }
    } finally {
      if (sequence === listSequence) loading.list = false
    }
  }

  async function loadDetail(itemId = selectedItemId.value) {
    if (!itemId) return
    const sequence = ++detailSequence
    loading.overview = true
    loading.timeline = true
    loading.causal = true
    errors.overview = null
    errors.timeline = null
    errors.causal = null
    const params = { days: filters.days }
    const [overviewResult, timelineResult, causalResult] = await Promise.allSettled([
      MercadoLivreService.getItemAnalyticsOverview(itemId, params),
      MercadoLivreService.getItemAnalyticsTimeline(itemId, params),
      MercadoLivreService.getItemCausalAnalysis(itemId, params),
    ])
    if (sequence !== detailSequence) return
    try {
      if (overviewResult.status === 'fulfilled') overview.value = normalizeItem(overviewResult.value.data)
      else {
        const legacyOverview = items.value.find((item) => item.item_id === itemId)
        if (legacyOverview) overview.value = normalizeItem(legacyOverview)
        else errors.overview = requestError(overviewResult.reason, 'Não foi possível carregar o resumo do anúncio.')
      }
      if (timelineResult.status === 'fulfilled') timeline.value = normalizeTimelineResponse(timelineResult.value.data)
      else {
        try {
          const legacy = await MercadoLivreService.getItemTimelineChart(itemId, params)
          if (sequence === detailSequence) timeline.value = normalizeTimelineResponse(legacy.data)
        } catch (error) {
          if (sequence === detailSequence) errors.timeline = requestError(error, 'Não foi possível carregar o histórico deste anúncio.')
        }
      }
      if (causalResult.status === 'fulfilled') causal.value = normalizeCausalResponse(causalResult.value.data)
      else errors.causal = requestError(causalResult.reason, 'Insights indisponíveis para este período.')
    } finally {
      if (sequence === detailSequence) {
        loading.overview = false
        loading.timeline = false
        loading.causal = false
      }
    }
  }

  async function selectItem(itemId, updateUrl = true) {
    selectedItemId.value = itemId || ''
    if (updateUrl) syncRoute()
    mobileListOpen.value = false
    overview.value = null
    timeline.value = null
    causal.value = null
    if (selectedItemId.value) await loadDetail(selectedItemId.value)
  }

  function clearSelection(updateUrl = true) {
    selectedItemId.value = ''
    overview.value = null
    timeline.value = null
    causal.value = null
    if (updateUrl) syncRoute()
  }

  function setFilter(key, value) {
    filters[key] = value
    if (key !== 'item') filters.page = 1
    syncRoute()
    if (key === 'search') {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        syncRoute()
        loadItems({ preserveSelection: false })
      }, 280)
    } else {
      loadItems({ preserveSelection: false })
    }
  }

  function setDays(days) {
    filters.days = Number(days)
    filters.page = 1
    syncRoute()
    loadItems()
  }

  function setMode(mode) {
    if (ANALYTICS_MODES.includes(mode)) {
      filters.mode = mode
      syncRoute()
    }
  }

  function setPage(page) {
    filters.page = page
    syncRoute()
    loadItems()
  }

  async function refresh() {
    await loadItems()
    if (selectedItemId.value) await loadDetail()
  }

  watch(() => filters.days, (days, previous) => {
    if (days !== previous && selectedItemId.value) loadDetail()
  })

  onMounted(() => {
    hydrateFromRoute()
    loadAccounts()
    loadItems({ preserveSelection: false })
  })
  onBeforeUnmount(() => clearTimeout(searchTimer))

  return {
    accounts,
    causal,
    errors,
    filters,
    items,
    loading,
    mobileListOpen,
    overview,
    pagination,
    query,
    selectedItem,
    selectedItemId,
    setDays,
    setFilter,
    setMode,
    setPage,
    selectItem,
    clearSelection,
    refresh,
    timeline,
  }
}
