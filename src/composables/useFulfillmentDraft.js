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
  const step = ref('health')
  const accounts = ref([])
  const accountId = ref('')
  const health = ref(null)
  const imports = ref([])
  const drafts = ref([])
  const preview = ref(null)
  const draftDetail = ref(null)
  const selectedImportId = ref(null)
  const draftKey = ref(randomKey())
  const lineInputs = reactive({})
  const error = ref('')
  const exportNotice = ref('')
  const loading = reactive({
    initialize: false,
    account: false,
    import: false,
    preview: false,
    draft: false,
    adjust: false,
    review: false,
    export: false,
    submit: false,
    package: false,
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

  function clearPlanning() {
    preview.value = null
    draftDetail.value = null
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
    imports.value = []
    drafts.value = []
    selectedImportId.value = null
    clearPlanning()
    step.value = 'health'
    await loadAccountContext()
  }

  async function loadAccountContext() {
    if (!accountId.value) return false
    loading.account = true
    error.value = ''
    try {
      const [healthResponse, importsResponse, draftsResponse] = await Promise.all([
        service.getFulfillmentHealth({ account_id: accountId.value }),
        service.listFulfillmentImports({ account_id: accountId.value, limit: 10 }),
        service.listFulfillmentDrafts({ account_id: accountId.value, limit: 10 }),
      ])
      health.value = healthResponse.data
      imports.value = importsResponse.data?.items || []
      drafts.value = draftsResponse.data?.items || []
      if (!selectedImportId.value || !imports.value.some(item => item.id === selectedImportId.value)) {
        selectedImportId.value = imports.value.find(item => ['valid', 'partial'].includes(item.status))?.id || null
      }
      return true
    } catch (err) {
      error.value = apiErrorMessage(err)
      return false
    } finally {
      loading.account = false
    }
  }

  async function uploadImport(file, reportType = 'planning') {
    if (!file || !accountId.value) return null
    loading.import = true
    error.value = ''
    try {
      const payload = new FormData()
      payload.append('account_id', accountId.value)
      payload.append('report_type', reportType)
      payload.append('file', file)
      const response = await service.uploadFulfillmentImport(payload)
      await loadAccountContext()
      selectedImportId.value = response.data?.import?.id || selectedImportId.value
      return response.data
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.import = false
    }
  }

  function inputLines() {
    return Object.entries(lineInputs).map(([inventoryId, values]) => ({
      inventory_id: inventoryId,
      local_available: values.localAvailable,
      pending_inbound: values.pendingInbound || 0,
      case_pack: values.casePack || 1,
      space_limit_units: values.spaceLimit,
    }))
  }

  function payload({ includeKey = false } = {}) {
    return {
      account_id: accountId.value,
      ...(includeKey ? { draft_key: draftKey.value } : {}),
      dispatch_date: parameters.dispatchDate,
      expected_receipt_date: parameters.receiptDate,
      planning_import_id: selectedImportId.value,
      target_days: Number(parameters.targetDays),
      safety_stock_days: Number(parameters.safetyStockDays),
      inventory_ttl_hours: Number(parameters.inventoryTtlHours),
      max_stock_age_days: parameters.maxStockAgeDays ? Number(parameters.maxStockAgeDays) : null,
      lines: inputLines(),
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

  async function calculatePreview() {
    if (!accountId.value) return null
    loading.preview = true
    error.value = ''
    try {
      const response = await service.previewFulfillmentDraft(payload())
      preview.value = response.data
      seedLineInputs(preview.value?.lines || [])
      return preview.value
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.preview = false
    }
  }

  async function openParameters() {
    await calculatePreview()
    step.value = 'parameters'
  }

  async function createDraft() {
    loading.draft = true
    error.value = ''
    try {
      const response = await service.createFulfillmentDraft(payload({ includeKey: true }))
      draftDetail.value = response.data
      step.value = 'review'
      await loadDraftHistory()
      return response.data
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.draft = false
    }
  }

  function reopenParameters() {
    draftDetail.value = null
    draftKey.value = randomKey()
    exportNotice.value = ''
    step.value = 'parameters'
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

  async function savePackage(line, packageData) {
    loading.package = true
    error.value = ''
    try {
      await service.saveFulfillmentPackageProfile({ item_id: line.identity.item_id, ...packageData })
      await calculatePreview()
    } catch (err) {
      error.value = apiErrorMessage(err)
      throw err
    } finally {
      loading.package = false
    }
  }

  return {
    step,
    accounts,
    accountId,
    accountOptions,
    health,
    accountHealth,
    imports,
    drafts,
    selectedImportId,
    preview,
    previewLines,
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
    uploadImport,
    calculatePreview,
    openParameters,
    createDraft,
    reopenParameters,
    loadDraft,
    adjustLine,
    reviewDraft,
    exportDraft,
    markSubmitted,
    savePackage,
  }
}
