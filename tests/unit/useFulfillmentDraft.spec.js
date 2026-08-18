// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { useFulfillmentDraft } from 'src/composables/useFulfillmentDraft'

function serviceMock() {
  const preview = {
    summary: { ready: 0, review: 2, blocked: 0 },
    queues: { send_now: 1, prepare: 1, monitor: 0, blocked: 0 },
    suggested_units: 30,
    lines: [
      {
        identity: { inventory_id: 'INV-1', item_id: 'MLB-1', sku: 'SKU-1', title: 'Produto urgente' },
        decision_status: 'review',
        calculated_quantity: 12,
        recommendation: { queue: 'send_now', reason: 'below_reorder_point', coverage_days: '2.0' },
      },
      {
        identity: { inventory_id: 'INV-2', item_id: 'MLB-2', sku: 'SKU-2', title: 'Produto para preparar' },
        decision_status: 'review',
        calculated_quantity: 18,
        recommendation: { queue: 'prepare', reason: 'target_coverage_gap', coverage_days: '15.0' },
      },
    ],
  }
  const draft = {
    draft: { id: 11, version: 1, status: 'draft' },
    lines: [{ id: 21, inventory_id: 'INV-1', decision_status: 'review', effective_quantity: 12 }],
    adjustments: [],
    exports: [],
  }
  return {
    listAccounts: vi.fn().mockResolvedValue({ data: [{ account_id: 'ACCOUNT-1', account_nickname: 'Principal', is_connected: true }] }),
    getFulfillmentHealth: vi.fn().mockResolvedValue({ data: { accounts: [{ account: { id: 'ACCOUNT-1' }, status: 'review' }] } }),
    listFulfillmentDrafts: vi.fn().mockResolvedValue({ data: { items: [] } }),
    previewFulfillmentDraft: vi.fn().mockResolvedValue({ data: preview }),
    createFulfillmentDraft: vi.fn().mockResolvedValue({ data: draft }),
    getFulfillmentDraft: vi.fn().mockResolvedValue({ data: draft }),
    adjustFulfillmentDraftLine: vi.fn().mockResolvedValue({ data: { ...draft, draft: { ...draft.draft, id: 12, version: 2 } } }),
    reviewFulfillmentDraft: vi.fn().mockResolvedValue({ data: { ...draft, draft: { ...draft.draft, status: 'reviewed' } } }),
    exportFulfillmentDraft: vi.fn(),
    markFulfillmentDraftSubmitted: vi.fn(),
  }
}

describe('useFulfillmentDraft', () => {
  it('loads the account and calculates suggestions automatically', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)

    await flow.initialize()

    expect(flow.accountId.value).toBe('ACCOUNT-1')
    expect(flow.accountHealth.value.status).toBe('review')
    expect(flow.step.value).toBe('suggestions')
    expect(service.previewFulfillmentDraft).toHaveBeenCalledOnce()
    expect(flow.selectedInventoryIds.value).toEqual(['INV-1', 'INV-2'])
  })

  it('keeps unavailable local stock unknown without blocking the calculated need', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()

    expect(flow.lineInputs['INV-1'].localAvailable).toBeNull()
    expect(flow.previewLines.value[0].calculated_quantity).toBe(12)
  })

  it('creates a draft only with the products selected in the suggestion queue', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    flow.selectedInventoryIds.value = ['INV-1']

    await flow.createDraft()

    const payload = service.createFulfillmentDraft.mock.calls[0][0]
    expect(payload.inventory_ids).toEqual(['INV-1'])
    expect(payload.lines).toHaveLength(1)
    expect(payload.lines[0]).toMatchObject({ inventory_id: 'INV-1', local_available: null, case_pack: 1 })
    expect(payload.planning_import_id).toBeNull()
    expect(payload.draft_key).toBeTruthy()
    expect(flow.step.value).toBe('review')
  })

  it('replaces the active draft with the new adjustment version', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    flow.selectedInventoryIds.value = ['INV-1']
    await flow.createDraft()

    await flow.adjustLine(21, 6, 'Contagem física revisada')

    expect(service.adjustFulfillmentDraftLine).toHaveBeenCalledWith(11, 21, { quantity: 6, reason: 'Contagem física revisada' })
    expect(flow.draft.value.version).toBe(2)
  })

  it('starts a new idempotency scope when returning to suggestions', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    flow.selectedInventoryIds.value = ['INV-1']
    await flow.createDraft()
    const firstKey = service.createFulfillmentDraft.mock.calls[0][0].draft_key

    flow.reopenSuggestions()
    flow.selectedInventoryIds.value = ['INV-1']
    await flow.createDraft()

    const secondKey = service.createFulfillmentDraft.mock.calls[1][0].draft_key
    expect(secondKey).not.toBe(firstKey)
  })

  it('keeps shadow-mode feedback inside execution instead of losing the error', async () => {
    const service = serviceMock()
    service.exportFulfillmentDraft.mockRejectedValue({ response: { data: { code: 'shadow_mode', detail: 'Validação de oito semanas em andamento.' } } })
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    flow.selectedInventoryIds.value = ['INV-1']
    await flow.createDraft()

    await expect(flow.exportDraft()).rejects.toBeTruthy()
    expect(flow.exportNotice.value).toBe('Validação de oito semanas em andamento.')
  })
})
