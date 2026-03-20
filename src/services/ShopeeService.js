
export default {
  listAccounts() {
    return api.get('/shopee/accounts/')
  },
  getAuthUrl() {
    return api.get('/shopee/accounts/auth_url/')
  },
  refreshToken(accountId) {
    return api.post(`/shopee/accounts/${accountId}/refresh_token/`)
  },
  syncOrders(accountId) {
    return api.post(`/shopee/accounts/${accountId}/sync_orders/`)
  },
  syncItems(accountId) {
    return api.post(`/shopee/accounts/${accountId}/sync_items/`)
  },
  deleteAccount(accountId) {
    return api.delete(`/shopee/accounts/${accountId}/`)
  },
}
