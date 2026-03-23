import { api } from 'src/boot/axios'

export default {
  listAccounts() {
    return api.get('/shopee/accounts/')
  },

  getAuthUrl(params) {
    // params: { partner_id, partner_key, redirect_url }
    return api.get('/shopee/accounts/auth_url/', { params })
  },

  callback(data) {
    // data: { partner_id, partner_key, code, shop_id, redirect_url? }
    return api.post('/shopee/accounts/callback/', data)
  },

  refreshToken(accountId) {
    return api.post(`/shopee/accounts/${accountId}/refresh_token/`)
  },

  syncOrders(accountId, payload = {}) {
    return api.post(`/shopee/accounts/${accountId}/sync_orders/`, payload)
  },

  syncItems(accountId) {
    return api.post(`/shopee/accounts/${accountId}/sync_items/`)
  },

  deleteAccount(accountId) {
    return api.delete(`/shopee/accounts/${accountId}/`)
  },
}
