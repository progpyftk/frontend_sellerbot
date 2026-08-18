import { computed, getCurrentInstance, onBeforeUnmount, reactive, ref } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { apiErrorMessage, downloadPlanCsv, localISODate } from 'src/utils/fulfillmentPlan'

const READY_STATUSES = ['ready', 'ready_with_warnings', 'reviewed', 'exported', 'submitted_manually']

function requestKey() {
  return globalThis.crypto?.randomUUID?.() || `full-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useFulfillmentShipmentPlan(service = MercadoLivreService) {
  const accounts = ref([])
  const accountId = ref('')
  const history = ref([])
  const plan = ref(null)
  const lines = ref([])
  const selectedLine = ref(null)
  const error = ref('')
  const search = ref('')
  const selectedActions = ref(['replenish_full', 'start_full', 'next_cycle'])
  const pagination = reactive({ page: 1, pageSize: 100, total: 0, hasNext: false })
  const parameters = reactive({ frequencyDays: 7, nextDispatchDate: localISODate() })
  const loading = reactive({ initialize: false, generate: false, lines: false, adjust: false, action: false })
  let cancelled = false

  const accountOptions = computed(() => accounts.value.map(account => ({
    label: `${account.account_nickname || account.account_id} (${account.account_id})`,
    value: account.account_id,
  })))
  const isReady = computed(() => READY_STATUSES.includes(plan.value?.status))
  const isGenerating = computed(() => plan.value?.status === 'generating' || loading.generate)

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
    accountId.value = value || ''
    plan.value = null
    lines.value = []
    selectedLine.value = null
    search.value = ''
    pagination.page = 1
    await loadHistory({ openLatest: true })
  }

  async function loadHistory({ openLatest = false } = {}) {
    if (!accountId.value) return
    try {
      const response = await service.listFulfillmentShipmentPlans({ account_id: accountId.value, limit: 20 })
      history.value = response.data?.items || []
      if (openLatest && history.value.length) await openPlan(history.value[0].id)
    } catch (err) {
      error.value = apiErrorMessage(err)
    }
  }

  async function generate() {
    if (!accountId.value) return
    loading.generate = true
    error.value = ''
    lines.value = []
    selectedLine.value = null
    try {
      const response = await service.createFulfillmentShipmentPlan({
        account_id: accountId.value,
        request_key: requestKey(),
        frequency_days: Number(parameters.frequencyDays),
        next_dispatch_date: parameters.nextDispatchDate,
        horizon_cycles: 4,
      })
      plan.value = response.data
      if (plan.value.status === 'generating') await pollPlan(plan.value.id)
      if (isReady.value) await Promise.all([loadDetail(plan.value.id), loadLines({ reset: true })])
      await loadHistory()
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.generate = false
    }
  }

  async function pollPlan(planId) {
    for (let attempt = 0; attempt < 90 && !cancelled; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const response = await service.getFulfillmentShipmentPlan(planId)
      plan.value = response.data?.plan || response.data
      if (plan.value.status === 'failed') throw new Error(plan.value.error_detail || 'Falha ao gerar o plano.')
      if (READY_STATUSES.includes(plan.value.status)) return
    }
    if (!cancelled) throw new Error('O cálculo está levando mais tempo que o esperado. Abra o histórico para acompanhar.')
  }

  async function openPlan(planId) {
    loading.lines = true
    error.value = ''
    try {
      await loadDetail(planId)
      if (plan.value?.status === 'generating') await pollPlan(planId)
      if (isReady.value) await loadLines({ reset: true })
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.lines = false
    }
  }

  async function loadDetail(planId = plan.value?.id) {
    if (!planId) return
    const response = await service.getFulfillmentShipmentPlan(planId)
    plan.value = response.data?.plan || response.data
  }

  async function loadLines({ reset = false } = {}) {
    if (!plan.value?.id) return
    if (reset) pagination.page = 1
    loading.lines = true
    try {
      const response = await service.getFulfillmentShipmentPlanLines(plan.value.id, {
        page: pagination.page,
        page_size: pagination.pageSize,
        actions: selectedActions.value.join(','),
        search: search.value || undefined,
      })
      lines.value = response.data?.items || []
      pagination.total = response.data?.total || 0
      pagination.hasNext = Boolean(response.data?.has_next)
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.lines = false
    }
  }

  async function changePage(page) {
    pagination.page = page
    await loadLines()
  }

  async function applyFilters() {
    await loadLines({ reset: true })
  }

  async function adjustLine({ lineId, quantity, action, reason }) {
    loading.adjust = true
    error.value = ''
    try {
      const response = await service.adjustFulfillmentShipmentPlanLine(plan.value.id, lineId, {
        quantity, action, reason,
      })
      const index = lines.value.findIndex(line => line.id === lineId)
      if (index >= 0) lines.value[index] = response.data
      selectedLine.value = response.data
      await loadDetail()
      return response.data
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.adjust = false
    }
  }

  async function reviewPlan() {
    return runPlanAction(async () => {
      const response = await service.reviewFulfillmentShipmentPlan(plan.value.id)
      plan.value = response.data
    })
  }

  async function exportPlan() {
    return runPlanAction(async () => {
      const response = await service.exportFulfillmentShipmentPlan(plan.value.id)
      downloadPlanCsv(response.data.content, response.data.export.filename)
      await loadDetail()
    })
  }

  async function markSubmitted(reference) {
    return runPlanAction(async () => {
      const response = await service.markFulfillmentShipmentPlanSubmitted(plan.value.id, { reference })
      plan.value = response.data
    })
  }

  async function runPlanAction(callback) {
    loading.action = true
    error.value = ''
    try {
      await callback()
      await loadHistory()
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.action = false
    }
  }

  if (getCurrentInstance()) onBeforeUnmount(() => { cancelled = true })

  return {
    accounts, accountId, accountOptions, history, plan, lines, selectedLine,
    parameters, search, selectedActions, pagination, loading, error, isReady, isGenerating,
    initialize, selectAccount, generate, openPlan, loadLines, changePage, applyFilters,
    adjustLine, reviewPlan, exportPlan, markSubmitted,
  }
}
