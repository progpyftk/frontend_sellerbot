// @vitest-environment jsdom
/** Contrato de filtros, navegação e concorrência das consultas da página. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { brazilDay, fieldText, initialFilters, requestParams, safePermalink } from 'src/utils/itemChanges'
import { useItemChanges } from 'src/composables/useItemChanges'

const mocks = vi.hoisted(() => ({ list: vi.fn(), accounts: vi.fn() }))
vi.mock('src/services/MercadoLivreService', () => ({ default: {
  listItemChanges: mocks.list, listAccounts: mocks.accounts,
} }))
const payload = id => ({ data: { count: 90, results: [{ id }], coverage: { accounts: [{ observed_items: 1 }] } } })
const Harness = defineComponent({ setup: () => useItemChanges(), template: '<div />' })
let wrapper
async function page(query = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/items/historico', component: Harness }] })
  await router.push({ path: '/items/historico', query })
  await router.isReady()
  wrapper = mount(Harness, { global: { plugins: [router] } })
  await flushPromises()
  return { vm: wrapper.vm, router }
}
beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue(payload(1))
  mocks.accounts.mockReset().mockResolvedValue({ data: [{ id: 7, account_nickname: 'Conta' }] })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })

describe('histórico de alterações', () => {
  it('calcula Ontem pelo calendário de Brasília e não pelo fuso do navegador', () => {
    expect(brazilDay(0, new Date('2026-10-19T01:00:00Z'))).toBe('2026-10-18')
    expect(brazilDay(-1, new Date('2026-10-19T01:00:00Z'))).toBe('2026-10-17')
  })
  it('traduz Preço e logística para os filtros do servidor', () => {
    const filters = { ...initialFilters(), changed_fields: ['price', 'base_price'], logistics: 'flex' }
    const params = requestParams(filters, { page: 2, rowsPerPage: 40, descending: true })
    expect(params).toMatchObject({ changed_fields: 'base_price,promotion_price', is_flex: true, page: 2 })
    expect(params.logistic_type).toBeUndefined()
  })
  it('distingue valor desconhecido, ausência de promoção e nomes simultâneos', () => {
    expect(fieldText(undefined, 'base_price')).toBe('Não disponível')
    expect(fieldText({ value: null }, 'promotion_price')).toBe('Sem promoção')
    expect(fieldText({ value: [{ id: 'P1', name: 'Um' }, { id: 'P2', name: 'Dois' }] }, 'promotions')).toBe('Um\nDois')
    expect(fieldText({ value: { logistic_type: 'cross_docking', is_flex: true } }, 'logistics')).toBe('Coleta + Flex')
    expect(safePermalink('javascript:alert(1)')).toBeNull()
    expect(safePermalink('https://produto.mercadolivre.com.br/MLB-1')).toBeTruthy()
  })
  it('restaura URL e pagina pelo servidor, voltando à primeira página ao filtrar', async () => {
    const { vm, router } = await page({ page: '3', account_id: '7', changed_fields: 'logistics' })
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, account_id: 7, changed_fields: 'logistics' }))
    vm.filters.status = 'paused'
    await vm.applyFilters(); await flushPromises()
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'paused' }))
    await vm.onRequest({ pagination: { page: 2, rowsPerPage: 20, descending: false } }); await flushPromises()
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 20, ordering: 'detected_at' }))
    expect(router.currentRoute.value.query.page).toBe('2')
    await router.push({ query: { ...router.currentRoute.value.query, page: '3' } }); await flushPromises()
    expect(vm.pagination.page).toBe(3)
    router.back(); await flushPromises()
    expect(vm.pagination.page).toBe(2)
  })
  it('descarta resposta antiga de outro filtro', async () => {
    let resolveOld
    mocks.list.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
    const { vm } = await page()
    vm.filters.account_id = 7
    mocks.list.mockResolvedValueOnce(payload(2))
    await vm.applyFilters(); await flushPromises()
    resolveOld(payload(999)); await flushPromises()
    expect(vm.rows).toEqual([{ id: 2 }])
    expect(vm.loading).toBe(false)
  })
  it('limpa resultados em erro e permite tentar novamente', async () => {
    const { vm } = await page()
    mocks.list.mockRejectedValueOnce(new Error('offline'))
    await vm.load()
    expect(vm.error).toContain('Não foi possível')
    expect(vm.rows).toEqual([])
    expect(vm.coverage).toBeNull()
    await vm.load()
    expect(vm.error).toBe('')
    expect(vm.rows).toEqual([{ id: 1 }])
  })
  it('busca aguarda 300 ms e não envia cada tecla', async () => {
    const { vm } = await page()
    vi.useFakeTimers()
    vm.filters.search = 'a'; vm.searchLater()
    vm.filters.search = 'adubo'; vm.searchLater()
    await vi.advanceTimersByTimeAsync(299)
    expect(mocks.list).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    vi.useRealTimers(); await flushPromises()
    expect(mocks.list).toHaveBeenCalledTimes(2)
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'adubo' }))
  })
})
