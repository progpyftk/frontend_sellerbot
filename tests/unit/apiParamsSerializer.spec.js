import { describe, expect, it } from 'vitest'

import { api } from 'src/boot/axios'

// FB-8: o padrão do axios é serializar arrays como `status[]=A&status[]=B`, formato que
// `request.query_params.getlist('status')` no Django não enxerga — o filtro de status da
// página de pedidos Shopee era descartado em silêncio. A instância precisa emitir chaves
// repetidas. Compara-se só a query, porque o baseURL muda entre dev e build.
describe('serialização de params da instância api', () => {
  const query = (params) => api.getUri({ url: '/shopee/orders/', params }).split('?')[1] ?? ''

  it('serializa arrays como chave repetida, sem colchetes', () => {
    expect(query({ status: ['UNPAID', 'SHIPPED'] })).toBe('status=UNPAID&status=SHIPPED')
  })

  it('mantém o formato de chave repetida com um único valor selecionado', () => {
    expect(query({ status: ['UNPAID'] })).toBe('status=UNPAID')
  })

  it('serializa múltiplos filtros de lista na mesma query', () => {
    expect(query({ status: ['UNPAID'], account: [1, 2], page: 1 })).toBe(
      'status=UNPAID&account=1&account=2&page=1',
    )
  })

  it('não altera filtros já enviados como CSV pelas páginas do Mercado Livre', () => {
    expect(query({ status: 'paid,cancelled' })).toBe('status=paid,cancelled')
  })
})
