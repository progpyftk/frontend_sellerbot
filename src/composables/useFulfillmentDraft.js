import { computed, reactive, ref } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import {
  apiErrorMessage,
  canReviewLines,
  createDefaultDates,
  normalizeAccounts,
} from 'src/utils/fulfillmentDraft'

function randomKey() {
  return globalThis.crypto?.randomUUID?.() || `full-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useFulfillmentDraft(service = MercadoLivreService) {
  const dates = createDefaultDates()
  const step = ref('suggestions')
  const accounts = ref([])
  const accountId = ref('')
  const health = ref(null)
  const drafts = ref([])
  const preview = ref(null)
  const draftDetail = ref(null)
  const selectedInventoryIds = ref([])
  const draftKey = ref(randomKey())
  const lineInputs = reactive({})
  const error = ref('')
  const exportNotice = ref('')
  const loading = reactive({
    initialize: false,
    account: false,
    preview: false,
    draft: false,
    adjust: false,
    review: false,
    export: false,
    submit: false,
  })
  const parameters = reactive({
    dispatchDate: dates.dispatchDate,
    receiptDate: dates.receiptDate,
    targetDays: 30,
    safetyStockDays: 7,
    inventoryTtlHours: 24,
    maxStockAgeDays: null,
  })

  const accountOptions = computed(() => accounts.value.map(account => ({
    label: `${account.account_nickname || account.account_id} (${account.account_id})`,
    value: account.account_id,
  })))
  const accountHealth = computed(() => health.value?.accounts?.find(row => row.account.id === accountId.value) || null)
  const previewLines = computed(() => preview.value?.lines || [])
  const draft = computed(() => draftDetail.value?.draft || null)
  const draftLines = computed(() => draftDetail.value?.lines || [])
  const canReview = computed(() => canReviewLines(draftLines.value))
  const selectedLines = computed(() => previewLines.value.filter(line => (
    selectedInventoryIds.value.includes(line.identity.inventory_id)
  )))

  function clearPlanning() {
    preview.value = null
    draftDetail.value = null
    selectedInventoryIds.value = []
    exportNotice.value = ''
    draftKey.value = randomKey()
    Object.keys(lineInputs).forEach(key => delete lineInputs[key])
  }

  async function initialize() {
    loading.initialize = true
    error.value = ''
    try {
      const response = await service.listAccounts()
      accounts.value = normalizeAccounts(response).filter(account => account.is_connected !== false)
      if (!accountId.value && accounts.value.length) accountId.value = accounts.value[0].account_id
      if (accountId.value) await loadAccountContext()
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.initialize = false
    }
  }

  async function selectAccount(value) {
    accountId.value = value || ''
    health.value = null
    drafts.value = []
    clearPlanning()
    step.value = 'suggestions'
    await loadAccountContext()
  }

  async function loadAccountContext() {
    if (!accountId.value) return false
    loading.account = true
    error.value = ''
    try {
      const [healthResponse, draftsResponse] = await Promise.all([
        service.getFulfillmentHealth({ account_id: accountId.value }),
        service.listFulfillmentDrafts({ account_id: accountId.value, limit: 10 }),
      ])
      health.value = healthResponse.data
      drafts.value = draftsResponse.data?.items || []
      await calculatePreview({ resetSelection: true })
      return true
    } catch (err) {
      error.value = apiErrorMessage(err)
      return false
    } finally {
      loading.account = false
    }
  }

  function inputLines(inventoryIds = null) {
    const selected = inventoryIds ? new Set(inventoryIds) : null
    return Object.entries(lineInputs)
      .filter(([inventoryId]) => !selected || selected.has(inventoryId))
      .map(([inventoryId, values]) => ({
        inventory_id: inventoryId,
        local_available: values.localAvailable,
        pending_inbound: values.pendingInbound || 0,
        case_pack: values.casePack || 1,
        space_limit_units: values.spaceLimit,
      }))
  }

  function payload({ includeKey = false, selectedOnly = false } = {}) {
    const inventoryIds = selectedOnly ? selectedInventoryIds.value : null
    return {
      account_id: accountId.value,
      ...(includeKey ? { draft_key: draftKey.value } : {}),
      dispatch_date: parameters.dispatchDate,
      expected_receipt_date: parameters.receiptDate,
      planning_import_id: null,
      target_days: Number(parameters.targetDays),
      safety_stock_days: Number(parameters.safetyStockDays),
      inventory_ttl_hours: Number(parameters.inventoryTtlHours),
      max_stock_age_days: parameters.maxStockAgeDays ? Number(parameters.maxStockAgeDays) : null,
      ...(inventoryIds ? { inventory_ids: [...inventoryIds] } : {}),
      lines: inputLines(inventoryIds),
    }
  }

  function seedLineInputs(lines) {
    lines.forEach(line => {
      const inventoryId = line.identity.inventory_id
      if (!lineInputs[inventoryId]) {
        lineInputs[inventoryId] = {
          localAvailable: null,
          pendingInbound: 0,
          casePack: 1,
          spaceLimit: null,
        }
      }
    })
  }

  function automaticSelection(lines) {
    return lines
      .filter(line => (
        ['send_now', 'prepare'].includes(line.recommendation?.queue)
        && Number(line.calculated_quantity) > 0
        && line.decision_status !== 'blocked'
      ))
      .map(line => line.identity.inventory_id)
  }

  async function calculatePreview({ resetSelection = false } = {}) {
    if (!accountId.value) return null
    loading.preview = true
    error.value = ''
    try {
      const previousSelection = new Set(selectedInventoryIds.value)
      const response = await service.previewFulfillmentDraft(payload())
      preview.value = response.data
      const lines = preview.value?.lines || []
      seedLineInputs(lines)
      if (resetSelection || !selectedInventoryIds.value.length) {
        selectedInventoryIds.value = automaticSelection(lines)
      } else {
        selectedInventoryIds.value = lines
          .map(line => line.identity.inventory_id)
          .filter(inventoryId => previousSelection.has(inventoryId))
      }
      return preview.value
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.preview = false
    }
  }

  async function createDraft() {
    if (!selectedInventoryIds.value.length) {
      error.value = 'Selecione ao menos uma sugestão com quantidade positiva para revisar.'
      throw new Error(error.value)
    }
    loading.draft = true
    error.value = ''
    try {
      const response = await service.createFulfillmentDraft(payload({ includeKey: true, selectedOnly: true }))
      draftDetail.value = response.data
      step.value = 'review'
      await loadDraftHistory()
      return response.data
    } catch (err) {
      error.value = error.value || apiErrorMessage(err)
      throw err
    } finally {
      loading.draft = false
    }
  }

  function reopenSuggestions() {
    draftDetail.value = null
    draftKey.value = randomKey()
    exportNotice.value = ''
    step.value = 'suggestions'
  }

  async function loadDraft(draftId) {
    loading.draft = true
    error.value = ''
    try {
      const response = await service.getFulfillmentDraft(draftId)
      draftDetail.value = response.data
      step.value = ['reviewed', 'exported', 'submitted_manually'].includes(response.data?.draft?.status)
        ? 'execution'
        : 'review'
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.draft = false
    }
  }

  async function loadDraftHistory() {
    if (!accountId.value) return
    const response = await service.listFulfillmentDrafts({ account_id: accountId.value, limit: 10 })
    drafts.value = response.data?.items || []
  }

  async function adjustLine(lineId, quantity, reason) {
    loading.adjust = true
    error.value = ''
    try {
      const response = await service.adjustFulfillmentDraftLine(draft.value.id, lineId, { quantity, reason })
      draftDetail.value = response.data
      await loadDraftHistory()
      return response.data
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.adjust = false
    }
  }

  async function reviewDraft() {
    loading.review = true
    error.value = ''
    try {
      const response = await service.reviewFulfillmentDraft(draft.value.id)
      draftDetail.value = response.data
      step.value = 'execution'
      await loadDraftHistory()
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.review = false
    }
  }

  async function exportDraft() {
    loading.export = true
    exportNotice.value = ''
    try {
      const response = await service.exportFulfillmentDraft(draft.value.id)
      exportNotice.value = 'Checklist gerado e vinculado a esta versão.'
      return response.data
    } catch (err) {
      exportNotice.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.export = false
    }
  }

  async function markSubmitted(reference) {
    loading.submit = true
    error.value = ''
    try {
      const response = await service.markFulfillmentDraftSubmitted(draft.value.id, { reference })
      draftDetail.value = response.data
      await loadDraftHistory()
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.submit = false
    }
  }

  return {
    step,
    accounts,
    accountId,
    accountOptions,
    health,
    accountHealth,
    drafts,
    preview,
    previewLines,
    selectedInventoryIds,
    selectedLines,
    draftDetail,
    draft,
    draftLines,
    canReview,
    parameters,
    lineInputs,
    loading,
    error,
    exportNotice,
    initialize,
    selectAccount,
    loadAccountContext,
    calculatePreview,
    createDraft,
    reopenSuggestions,
    loadDraft,
    adjustLine,
    reviewDraft,
    exportDraft,
    markSubmitted,
  }
}
