/** Pure reducer for the public SellerBot SSE contract. */

const SAFE_ERROR = 'Não foi possível processar a mensagem. Tente novamente.'
const MAX_LOGS = 100
const MAX_IMAGES = 4

export const createAssistantMessage = () => ({
  role: 'assistant',
  content: '',
  images: [],
  logs: [],
  loading: true,
  hasError: false,
  logsOpen: false,
  startedAt: Date.now(),
  elapsedSec: 0,
  agent: null,
  pendingApproval: null,
  approvals: [],
  artifactValidation: null,
  batchStatus: null,
})

export function reduceSellerbotEvent(message, event) {
  if (!message || !event || typeof event.type !== 'string') return message

  const next = { ...message, logs: [...(message.logs || [])], images: [...(message.images || [])] }
  switch (event.type) {
    case 'thinking':
      next.loadingText = safeLogText(event.text, 'Processando sua solicitação...')
      appendLog(next, { type: 'thinking', text: next.loadingText })
      break

    case 'tool_call':
      next.loadingText = safeLogText(event.text, 'Consultando dados...')
      appendLog(next, { type: 'tool_call', text: next.loadingText })
      break

    case 'tool_result':
      appendLog(next, { type: 'tool_result', text: safeLogText(event.text, 'Dados recebidos') })
      break

    case 'image':
      if (isPublicUrl(event.url) && !next.images.includes(event.url)) {
        next.images = [...next.images, event.url].slice(0, MAX_IMAGES)
      }
      appendLog(next, { type: 'tool_result', text: 'Imagem recebida' })
      break

    case 'listing_draft_ready':
      next.pendingDraft = {
        draft: sanitizeDraft(event.draft),
        instructions: safeLogText(event.instructions, 'Revise o rascunho antes de publicar.'),
        status: 'pending',
      }
      appendLog(next, { type: 'tool_result', text: 'Rascunho de anúncio pronto para revisão' })
      break

    case 'approval_required':
      next.pendingApproval = sanitizeApproval(event)
      next.approvals = [...(next.approvals || []).filter(item => item.approval_id !== next.pendingApproval.approval_id), next.pendingApproval]
      appendLog(next, { type: 'tool_result', text: 'Aprovação humana necessária' })
      break

    case 'approval_state':
      next.pendingApproval = {
        ...(next.pendingApproval || {}),
        ...sanitizeApproval(event),
      }
      next.approvals = (next.approvals || []).map(item => item.approval_id === next.pendingApproval.approval_id ? next.pendingApproval : item)
      break

    case 'artifact_validation':
      next.artifactValidation = sanitizeArtifactValidation(event)
      break

    case 'batch_status':
    case 'partial':
      next.batchStatus = sanitizeBatchStatus(event)
      appendLog(next, { type: 'tool_result', text: event.type === 'partial' ? 'Lote concluído parcialmente' : 'Progresso do lote atualizado' })
      break

    case 'token':
      if (typeof event.text === 'string') next.content = `${next.content || ''}${event.text}`
      next.loadingText = null
      break

    case 'done':
      // The final response is authoritative and replaces any streamed partial text.
      next.content = typeof event.response === 'string' && event.response ? event.response : (next.content || '')
      next.agent = typeof event.agent === 'string' ? event.agent : null
      mergeImages(next, event.images)
      next.loading = false
      break

    case 'error':
      next.content = SAFE_ERROR
      next.hasError = true
      next.loading = false
      next.logsOpen = true
      appendLog(next, { type: 'error', text: SAFE_ERROR })
      break

    case 'end':
      next.loading = false
      break
  }

  return next
}

export function normalizeHistoricalMessage(raw) {
  const message = {
    ...raw,
    content: typeof raw?.content === 'string' ? raw.content : '',
    images: Array.isArray(raw?.images) ? raw.images.filter(isPublicUrl).slice(0, MAX_IMAGES) : [],
    logs: Array.isArray(raw?.logs) ? raw.logs.map(sanitizeHistoricalLog).filter(Boolean).slice(0, MAX_LOGS) : [],
  }
  return message
}

export function safeErrorText() {
  return SAFE_ERROR
}

function appendLog(message, log) {
  if (message.logs.length < MAX_LOGS) message.logs.push(log)
}

function mergeImages(message, images) {
  if (!Array.isArray(images)) return
  for (const image of images) {
    if (isPublicUrl(image) && !message.images.includes(image)) message.images.push(image)
  }
  message.images = message.images.slice(0, MAX_IMAGES)
}

function sanitizeDraft(draft) {
  if (!draft || typeof draft !== 'object') return null
  const allowed = [
    'draft_id', 'approval_id', 'marketplace', 'action', 'status', 'title', 'family_name',
    'category_name', 'price', 'available_quantity', 'condition', 'listing_type_id', 'warnings',
  ]
  return Object.fromEntries(allowed.filter(key => key in draft).map(key => [key, draft[key]]))
}

function sanitizeApproval(event) {
  const allowed = ['approval_id', 'sku', 'status', 'expires_at', 'reason', 'marketplace', 'action']
  return Object.fromEntries(allowed.filter(key => typeof event?.[key] === 'string').map(key => [key, event[key].slice(0, 255)]))
}

function sanitizeArtifactValidation(event) {
  return {
    artifact_id: typeof event?.artifact_id === 'string' ? event.artifact_id.slice(0, 120) : null,
    valid: event?.valid === true,
    errors: Array.isArray(event?.errors)
      ? event.errors.filter(item => item && Number.isInteger(item.row) && typeof item.message === 'string')
        .slice(0, 100).map(item => ({ row: Math.max(0, item.row), message: item.message.slice(0, 2_000) }))
      : [],
  }
}

function sanitizeBatchStatus(event) {
  const result = {}
  for (const key of ['run_id', 'status']) {
    if (typeof event?.[key] === 'string') result[key] = event[key].slice(0, 120)
  }
  for (const key of ['succeeded', 'failed', 'pending']) {
    if (Number.isInteger(event?.[key])) result[key] = Math.max(0, Math.min(event[key], 100000))
  }
  if (Array.isArray(event?.retryable)) {
    result.retryable = event.retryable.filter(item => typeof item === 'string').slice(0, 100).map(item => item.slice(0, 120))
  }
  if (Array.isArray(event?.skus)) {
    result.skus = event.skus.filter(item => item && typeof item.sku === 'string')
      .slice(0, 500).map(item => ({
        sku: item.sku.slice(0, 120),
        status: typeof item.status === 'string' ? item.status.slice(0, 80) : 'pending',
        selected: item.selected !== false,
        ...(typeof item.approval_id === 'string' && item.approval_id ? { approval_id: item.approval_id.slice(0, 120) } : {}),
        ...(typeof item.tiny_approval_id === 'string' && item.tiny_approval_id ? { tiny_approval_id: item.tiny_approval_id.slice(0, 120) } : {}),
      }))
  }
  if (typeof event?.kind === 'string') result.kind = event.kind.slice(0, 80)
  return result
}

function sanitizeHistoricalLog(log) {
  if (!log || typeof log !== 'object' || typeof log.type !== 'string') return null
  const text = safeLogText(log.text, '')
  if (!text) return null
  return { type: log.type, text }
}

function safeLogText(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback
  // Old tool logs may contain serialized arguments. Keep the trail, drop the payload.
  if (/^\s*[{'"[]/.test(value) || /\b(args|arguments|payload|traceback)\b\s*[:=]/i.test(value)) {
    return fallback
  }
  return value.slice(0, 2_000)
}

function isPublicUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value)
}
