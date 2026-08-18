// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { useFulfillmentDraft } from 'src/composables/useFulfillmentDraft'

function serviceMock() {
  const preview = {
    summary: { ready: 0, review: 1, blocked: 1 },
    lines: [
      {
        identity: { inventory_id: 'INV-1', item_id: 'MLB-1', sku: 'SKU-1' },
        decision_status: 'review',
        calculated_quantity: null,
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
    listFulfillmentImports: vi.fn().mockResolvedValue({ data: { items: [{ id: 3, status: 'valid', original_filename: 'full.csv' }] } }),
    listFulfillmentDrafts: vi.fn().mockResolvedValue({ data: { items: [] } }),
    previewFulfillmentDraft: vi.fn().mockResolvedValue({ data: preview }),
    createFulfillmentDraft: vi.fn().mockResolvedValue({ data: draft }),
    getFulfillmentDraft: vi.fn().mockResolvedValue({ data: draft }),
    adjustFulfillmentDraftLine: vi.fn().mockResolvedValue({ data: { ...draft, draft: { ...draft.draft, id: 12, version: 2 } } }),
    reviewFulfillmentDraft: vi.fn().mockResolvedValue({ data: { ...draft, draft: { ...draft.draft, status: 'reviewed' } } }),
    exportFulfillmentDraft: vi.fn(),
    markFulfillmentDraftSubmitted: vi.fn(),
    uploadFulfillmentImport: vi.fn(),
    saveFulfillmentPackageProfile: vi.fn(),
  }
}

describe('useFulfillmentDraft', () => {
  it('loads account health, latest valid import and history together', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)

    await flow.initialize()

    expect(flow.accountId.value).toBe('ACCOUNT-1')
    expect(flow.accountHealth.value.status).toBe('review')
    expect(flow.selectedImportId.value).toBe(3)
    expect(service.getFulfillmentHealth).toHaveBeenCalledWith({ account_id: 'ACCOUNT-1' })
  })

  it('opens parameters with null manual stock instead of manufacturing zero', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()

    await flow.openParameters()

    expect(flow.step.value).toBe('parameters')
    expect(flow.lineInputs['INV-1'].localAvailable).toBeNull()
    expect(flow.previewLines.value[0].calculated_quantity).toBeNull()
  })

  it('sends explicit manual inputs and advances to versioned review', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    await flow.openParameters()
    flow.lineInputs['INV-1'].localAvailable = 30
    flow.lineInputs['INV-1'].casePack = 6

    await flow.createDraft()

    const payload = service.createFulfillmentDraft.mock.calls[0][0]
    expect(payload.lines[0]).toMatchObject({ inventory_id: 'INV-1', local_available: 30, case_pack: 6 })
    expect(payload.draft_key).toBeTruthy()
    expect(flow.step.value).toBe('review')
    expect(flow.draft.value.version).toBe(1)
  })

  it('replaces the active draft with the new adjustment version', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    await flow.openParameters()
    await flow.createDraft()

    await flow.adjustLine(21, 6, 'Contagem física revisada')

    expect(service.adjustFulfillmentDraftLine).toHaveBeenCalledWith(11, 21, { quantity: 6, reason: 'Contagem física revisada' })
    expect(flow.draft.value.version).toBe(2)
  })

  it('starts a new idempotency scope when the operator revises parameters', async () => {
    const service = serviceMock()
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    await flow.openParameters()
    await flow.createDraft()
    const firstKey = service.createFulfillmentDraft.mock.calls[0][0].draft_key

    flow.reopenParameters()
    await flow.createDraft()

    const secondKey = service.createFulfillmentDraft.mock.calls[1][0].draft_key
    expect(secondKey).not.toBe(firstKey)
  })

  it('keeps shadow-mode feedback inside execution instead of losing the error', async () => {
    const service = serviceMock()
    service.exportFulfillmentDraft.mockRejectedValue({ response: { data: { code: 'shadow_mode', detail: 'Validação de oito semanas em andamento.' } } })
    const flow = useFulfillmentDraft(service)
    await flow.initialize()
    await flow.openParameters()
    await flow.createDraft()

    await expect(flow.exportDraft()).rejects.toBeTruthy()
    expect(flow.exportNotice.value).toBe('Validação de oito semanas em andamento.')
  })
})
