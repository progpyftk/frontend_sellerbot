import { computed, getCurrentInstance, onBeforeUnmount, reactive, ref } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { apiErrorMessage } from 'src/utils/fulfillmentPlan'

const READY_STATUSES = ['ready', 'ready_with_warnings']

function requestKey() {
  return globalThis.crypto?.randomUUID?.() || `oof-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useFulfillmentOutOfFull(service = MercadoLivreService) {
  const accounts = ref([])
  const accountId = ref('')
  const history = ref([])
  const suggestion = ref(null)
  const lines = ref([])
  const error = ref('')
  const search = ref('')
  const selectedActions = ref(['start_full', 'next_cycle'])
  const pagination = reactive({ page: 1, pageSize: 100, total: 0, hasNext: false })
  const frequencyDays = ref(7)
  const loading = reactive({ initialize: false, generate: false, lines: false })
  const pollTimedOut = ref(false)
  let generationToken = 0
  let linesToken = 0

  const accountOptions = computed(() => accounts.value.map(account => ({
    label: `${account.account_nickname || account.account_id} (${account.account_id})`,
    value: account.account_id,
  })))
  const isReady = computed(() => READY_STATUSES.includes(suggestion.value?.status))
  const isGenerating = computed(() => loading.generate || (suggestion.value?.status === 'generating' && !pollTimedOut.value))

  async function initialize() {
    loading.initialize = true
    error.value = ''
    try {
      const response = await service.listAccounts()
      const data = response?.data
      accounts.value = (Array.isArray(data) ? data : data?.results || []).filter(row => row.is_connected !== false)
      if (accounts.value.length) {
        accountId.value = accounts.value[0].account_id
        await loadHistory({ openLatest: true })
      }
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.initialize = false
    }
  }

  async function selectAccount(value) {
    const token = ++generationToken
    linesToken += 1
    loading.generate = false
    pollTimedOut.value = false
    accountId.value = value || ''
    suggestion.value = null
    lines.value = []
    search.value = ''
    pagination.page = 1
    await loadHistory({ openLatest: true, token, requestedAccount: accountId.value })
  }

  async function loadHistory({ openLatest = false, token = generationToken, requestedAccount = accountId.value } = {}) {
    if (!accountId.value) return
    try {
      const response = await service.listFulfillmentOutOfFullSuggestions({ account_id: requestedAccount, page_size: 20 })
      if (token !== generationToken || requestedAccount !== accountId.value) return
      history.value = response.data?.items || []
      if (openLatest && history.value.length) await openSuggestion(history.value[0].id)
    } catch (err) {
      if (token !== generationToken || requestedAccount !== accountId.value) return
      error.value = apiErrorMessage(err)
    }
  }

  async function generate() {
    if (!accountId.value) return
    const token = ++generationToken
    const requestedAccount = accountId.value
    pollTimedOut.value = false
    loading.generate = true
    error.value = ''
    lines.value = []
    try {
      const response = await service.createFulfillmentOutOfFullJob({
        account_id: accountId.value,
        request_key: requestKey(),
        frequency_days: Number(frequencyDays.value),
      })
      if (token !== generationToken || requestedAccount !== accountId.value) return
      suggestion.value = response.data
      if (suggestion.value.status === 'generating') await pollSuggestion(suggestion.value.id, token, requestedAccount)
      if (token !== generationToken || requestedAccount !== accountId.value) return
      if (isReady.value) await loadLines({ reset: true })
      await loadHistory({ token, requestedAccount })
    } catch (err) {
      if (token !== generationToken || requestedAccount !== accountId.value) return
      error.value = apiErrorMessage(err)
    } finally {
      if (token === generationToken) loading.generate = false
    }
  }

  async function pollSuggestion(suggestionId, token, requestedAccount) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (token !== generationToken || requestedAccount !== accountId.value) return false
      const response = await service.getFulfillmentOutOfFullSuggestion(suggestionId)
      if (token !== generationToken || requestedAccount !== accountId.value) return false
      suggestion.value = response.data?.suggestion || response.data
      if (suggestion.value.status === 'failed') throw new Error(suggestion.value.error_detail || 'Falha ao gerar as sugestões.')
      if (READY_STATUSES.includes(suggestion.value.status)) return true
    }
    pollTimedOut.value = true
    throw new Error('O cálculo continua em segundo plano. Atualize o status em instantes.')
  }

  async function openSuggestion(suggestionId) {
    const token = ++generationToken
    linesToken += 1
    loading.generate = false
    pollTimedOut.value = false
    loading.lines = true
    error.value = ''
    try {
      const response = await service.getFulfillmentOutOfFullSuggestion(suggestionId)
      if (token !== generationToken) return
      suggestion.value = response.data?.suggestion || response.data
      lines.value = response.data?.items || []
      pagination.total = response.data?.total || 0
      pagination.hasNext = Boolean(response.data?.has_next)
      frequencyDays.value = Number(suggestion.value?.frequency_days || 7)
    } catch (err) {
      if (token !== generationToken) return
      error.value = apiErrorMessage(err)
    } finally {
      if (token === generationToken) loading.lines = false
    }
  }

  async function refreshSuggestion() {
    if (!suggestion.value?.id) return
    loading.lines = true
    error.value = ''
    try {
      await openSuggestion(suggestion.value.id)
      pollTimedOut.value = suggestion.value?.status === 'generating'
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.lines = false
    }
  }

  async function loadLines({ reset = false } = {}) {
    if (!suggestion.value?.id) return
    const request = ++linesToken
    const suggestionId = suggestion.value.id
    const token = generationToken
    if (reset) pagination.page = 1
    loading.lines = true
    try {
      const response = await service.getFulfillmentOutOfFullSuggestion(suggestionId, {
        page: pagination.page,
        page_size: pagination.pageSize,
        actions: selectedActions.value.join(','),
        search: search.value || undefined,
      })
      if (request !== linesToken || token !== generationToken || suggestionId !== suggestion.value?.id) return
      lines.value = response.data?.items || []
      pagination.total = response.data?.total || 0
      pagination.hasNext = Boolean(response.data?.has_next)
    } catch (err) {
      if (request !== linesToken || token !== generationToken) return
      error.value = apiErrorMessage(err)
    } finally {
      if (request === linesToken) loading.lines = false
    }
  }

  async function changePage(page) {
    pagination.page = page
    await loadLines()
  }

  async function applyFilters() {
    await loadLines({ reset: true })
  }

  if (getCurrentInstance()) onBeforeUnmount(() => { generationToken += 1 })

  return {
    accounts, accountId, accountOptions, history, suggestion, lines, error, search,
    selectedActions, pagination, frequencyDays, loading, isReady, isGenerating, pollTimedOut,
    initialize, selectAccount, generate, openSuggestion, refreshSuggestion, loadLines,
    changePage, applyFilters,
  }
}
