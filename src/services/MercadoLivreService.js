import { api } from 'src/boot/axios'

export default {
  // Lista itens com filtros
  listItems(params) {
    // params ex: { search: 'sku', page: 1, page_size: 50 }
    return api.get('/mercadolivre/items/', { params })
  },

  // Busca detalhes de um item específico
  getItem(id) {
    return api.get(`/mercadolivre/items/${id}/`)
  },

  // Força sincronização de uma conta (se implementarmos o endpoint no futuro)
  syncAccount(accountId) {
    return api.post(`/mercadolivre/accounts/${accountId}/sync/`)
  }
}
