/** Consulta paginada; a URL conserva filtros e respostas antigas são descartadas. */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { brazilDay, initialFilters, requestParams } from 'src/utils/itemChanges'

export function useItemChanges() {
  const route = useRoute()
  const router = useRouter()
  const filters = reactive(initialFilters(route.query))
  const pagination = ref({ page: 1, rowsPerPage: 40, rowsNumber: 0, sortBy: 'detected_at', descending: true })
  const rows = ref([]), accounts = ref([]), coverage = ref(null)
  const loading = ref(false), error = ref(''), accountError = ref('')
  let generation = 0, searchTimer
  const hasCoverage = computed(() => coverage.value?.accounts?.some(a => a.observed_items > 0))

  function hydrate() {
    Object.assign(filters, initialFilters(route.query))
    const size = Number(route.query.page_size)
    pagination.value = { ...pagination.value, page: Math.max(1, Number(route.query.page) || 1),
      rowsPerPage: [20, 40, 100, 200].includes(size) ? size : 40,
      descending: route.query.ordering !== 'detected_at' }
  }

  async function load() {
    const current = ++generation
    loading.value = true
    error.value = ''
    rows.value = []
    coverage.value = null
    try {
      const { data } = await MercadoLivreService.listItemChanges(requestParams(filters, pagination.value))
      if (current !== generation) return
      rows.value = data.results
      pagination.value.rowsNumber = data.count
      coverage.value = data.coverage
    } catch (err) {
      if (current !== generation) return
      pagination.value.rowsNumber = 0
      const detail = err.response?.data
      error.value = typeof detail?.detail === 'string' ? detail.detail
        : 'Não foi possível consultar o histórico. Confira os filtros e tente novamente.'
    } finally {
      if (current === generation) loading.value = false
    }
  }

  async function saveAndLoad() {
    clearTimeout(searchTimer)
    // Invalida também requisições em voo antes de aguardar a navegação.
    generation++
    const query = { ...requestParams(filters, pagination.value) }
    delete query.is_full; delete query.is_flex; delete query.logistic_type
    if (filters.logistics) query.logistics = filters.logistics
    const resolved = router.resolve({ path: route.path, query }).fullPath
    if (route.fullPath === resolved) return load()
    await router.replace({ query })
  }

  function applyFilters() { pagination.value.page = 1; return saveAndLoad() }
  function searchLater() {
    generation++
    rows.value = []
    clearTimeout(searchTimer)
    searchTimer = setTimeout(applyFilters, 300)
  }
  function setPeriod(preset) {
    filters.date_to = brazilDay(preset === 'yesterday' ? -1 : 0)
    filters.date_from = preset === 'week' ? brazilDay(-6) : filters.date_to
    return applyFilters()
  }
  function clearFilters() {
    Object.assign(filters, initialFilters())
    return applyFilters()
  }
  function onRequest({ pagination: requested }) {
    pagination.value = { ...requested, sortBy: 'detected_at' }
    return saveAndLoad()
  }
  async function loadAccounts() {
    try {
      const { data } = await MercadoLivreService.listAccounts()
      accounts.value = Array.isArray(data) ? data : data.results || []
      accountError.value = ''
    } catch { accountError.value = 'Não foi possível carregar as contas.' }
  }

  watch(() => route.fullPath, () => { hydrate(); load() })
  onMounted(() => { hydrate(); load(); loadAccounts() })
  onBeforeUnmount(() => { generation++; clearTimeout(searchTimer) })
  return { filters, pagination, rows, accounts, coverage, hasCoverage, loading, error, accountError,
    load, loadAccounts, applyFilters, searchLater, setPeriod, clearFilters, onRequest }
}
