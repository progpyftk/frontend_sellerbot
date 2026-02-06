// src/services/MercadoLivreService.js
import { api } from 'src/boot/axios'

export default {
  listItems(pagination, filters) {
    const { page, rowsPerPage, sortBy, descending } = pagination

    const params = {
      page: page,
      page_size: rowsPerPage,
      ordering: descending ? `-${sortBy}` : sortBy,
      search: filters.search || undefined,
    }

    if (filters.account?.length) params.account = filters.account.join(',')
    if (filters.logistic_type?.length) params.logistic_type = filters.logistic_type.join(',')
    if (filters.status?.length) params.status = filters.status.join(',')

    if (filters.is_flex !== null && filters.is_flex !== undefined) params.is_flex = filters.is_flex
    if (filters.priceMin) params.price_min = filters.priceMin
    if (filters.priceMax) params.price_max = filters.priceMax

    if (filters.stockStatus === 'zero') params.stock_status = 'zero'
    if (filters.stockStatus === 'positive') params.stock_status = 'positive'

    return api.get('/mercadolivre/items/', { params })
  },

  // IMPORTANTE: agora recebe o MLB (item_id)
  getItem(itemId) {
    return api.get(`/mercadolivre/items/${itemId}/`)
  },

  // você disse que já tem
  listAccounts() {
    return api.get('/mercadolivre/accounts/')
  },

  getPermalink(permalink) {
    if (!permalink) return '#'
    return permalink
  }
}
