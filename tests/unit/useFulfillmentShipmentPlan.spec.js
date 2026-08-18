// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { useFulfillmentShipmentPlan } from 'src/composables/useFulfillmentShipmentPlan'

const readyPlan = {
  id: 41,
  status: 'ready_with_warnings',
  frequency_days: 7,
  next_dispatch_date: '2026-08-18',
  strategy: { regime: 'growth', rationale: 'Crescimento controlado.' },
  summary: { start_full: 1, replenish_full: 1 },
}
const planLines = [
  {
    id: 1,
    item_id_ml: 'MLB-NEW',
    variation_id_ml: 'VAR-1',
    inventory_id: null,
    sku: 'SKU-NEW',
    title: 'Produto novo no Full',
    action: 'start_full',
    need_quantity: 8,
    recommended_quantity: 6,
    effective_quantity: 6,
  },
]

function serviceMock() {
  return {
    listAccounts: vi.fn().mockResolvedValue({ data: [{ account_id: 'ACCOUNT-1', account_nickname: 'Principal', is_connected: true }] }),
    listFulfillmentShipmentPlans: vi.fn().mockResolvedValue({ data: { items: [] } }),
    createFulfillmentShipmentPlan: vi.fn().mockResolvedValue({ data: readyPlan }),
    getFulfillmentShipmentPlan: vi.fn().mockResolvedValue({ data: { plan: readyPlan, adjustments: [], exports: [] } }),
    getFulfillmentShipmentPlanLines: vi.fn().mockResolvedValue({ data: { items: planLines, page: 1, page_size: 100, total: 1, has_next: false } }),
    adjustFulfillmentShipmentPlanLine: vi.fn().mockResolvedValue({ data: { ...planLines[0], adjusted_quantity: 3, effective_quantity: 3 } }),
    reviewFulfillmentShipmentPlan: vi.fn().mockResolvedValue({ data: { ...readyPlan, status: 'reviewed' } }),
    exportFulfillmentShipmentPlan: vi.fn(),
    markFulfillmentShipmentPlanSubmitted: vi.fn(),
  }
}

describe('useFulfillmentShipmentPlan', () => {
  it('loads the account without generating a plan silently', async () => {
    const service = serviceMock()
    const flow = useFulfillmentShipmentPlan(service)

    await flow.initialize()

    expect(flow.accountId.value).toBe('ACCOUNT-1')
    expect(service.createFulfillmentShipmentPlan).not.toHaveBeenCalled()
    expect(service.listFulfillmentShipmentPlans).toHaveBeenCalledWith({ account_id: 'ACCOUNT-1', limit: 20 })
  })

  it('sends frequency and next dispatch only after the user generates', async () => {
    const service = serviceMock()
    const flow = useFulfillmentShipmentPlan(service)
    await flow.initialize()
    flow.parameters.frequencyDays = 14
    flow.parameters.nextDispatchDate = '2026-08-25'

    await flow.generate()

    expect(service.createFulfillmentShipmentPlan).toHaveBeenCalledWith(expect.objectContaining({
      account_id: 'ACCOUNT-1', frequency_days: 14, next_dispatch_date: '2026-08-25', horizon_cycles: 4,
    }))
    expect(flow.plan.value.strategy.regime).toBe('growth')
    expect(flow.lines.value[0].inventory_id).toBeNull()
    expect(flow.lines.value[0].action).toBe('start_full')
  })

  it('passes action and search filters to the paginated API', async () => {
    const service = serviceMock()
    const flow = useFulfillmentShipmentPlan(service)
    await flow.initialize()
    await flow.generate()
    flow.selectedActions.value = ['start_full']
    flow.search.value = 'SKU-NEW'

    await flow.applyFilters()

    expect(service.getFulfillmentShipmentPlanLines).toHaveBeenLastCalledWith(41, expect.objectContaining({
      actions: 'start_full', search: 'SKU-NEW', page: 1,
    }))
  })

  it('updates the visible line after an audited adjustment', async () => {
    const service = serviceMock()
    const flow = useFulfillmentShipmentPlan(service)
    await flow.initialize()
    await flow.generate()

    await flow.adjustLine({ lineId: 1, quantity: 3, action: 'start_full', reason: 'Limite físico conferido' })

    expect(service.adjustFulfillmentShipmentPlanLine).toHaveBeenCalledWith(41, 1, {
      quantity: 3, action: 'start_full', reason: 'Limite físico conferido',
    })
    expect(flow.lines.value[0].effective_quantity).toBe(3)
  })

  it('ignores a late history response after the account changes', async () => {
    let resolveFirstHistory
    const service = serviceMock()
    service.listAccounts.mockResolvedValue({ data: [
      { account_id: 'ACCOUNT-1', account_nickname: 'Principal', is_connected: true },
      { account_id: 'ACCOUNT-2', account_nickname: 'Secundária', is_connected: true },
    ] })
    service.listFulfillmentShipmentPlans
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirstHistory = resolve }))
      .mockResolvedValueOnce({ data: { items: [{ id: 82, account_id: 'ACCOUNT-2' }] } })
    const flow = useFulfillmentShipmentPlan(service)
    const initialization = flow.initialize()
    await Promise.resolve()

    await flow.selectAccount('ACCOUNT-2')
    resolveFirstHistory({ data: { items: [{ id: 41, account_id: 'ACCOUNT-1' }] } })
    await initialization

    expect(flow.accountId.value).toBe('ACCOUNT-2')
    expect(flow.history.value).toEqual([{ id: 82, account_id: 'ACCOUNT-2' }])
  })

  it('marks an opened plan stale when operational parameters change', async () => {
    const service = serviceMock()
    const flow = useFulfillmentShipmentPlan(service)
    await flow.initialize()
    await flow.generate()

    flow.parameters.frequencyDays = 14

    expect(flow.parametersChanged.value).toBe(true)
  })
})
