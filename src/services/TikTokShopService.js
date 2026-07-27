import { api } from 'src/boot/axios'

export default {
  listAccounts() {
    return api.get('/tiktokshop/accounts/')
  },

  getAuthUrl(params) {
    return api.get('/tiktokshop/accounts/auth_url/', { params })
  },

  callback(data) {
    return api.post('/tiktokshop/accounts/callback/', data)
  },

  refreshToken(accountId) {
    return api.post(`/tiktokshop/accounts/${accountId}/refresh_token/`)
  },

  deleteAccount(accountId) {
    return api.delete(`/tiktokshop/accounts/${accountId}/`)
  },

  syncOrders(accountId, payload = {}) {
    return api.post(`/tiktokshop/accounts/${accountId}/sync_orders/`, payload)
  },

  syncItems(accountId) {
    return api.post(`/tiktokshop/accounts/${accountId}/sync_items/`)
  },

  // Orders
  listOrders(params = {}) {
    return api.get('/tiktokshop/orders/', { params })
  },

  getOrder(orderId) {
    return api.get(`/tiktokshop/orders/${orderId}/`)
  },

  // Items
  listItems(params = {}) {
    return api.get('/tiktokshop/items/', { params })
  },

  getItem(itemId) {
    return api.get(`/tiktokshop/items/${itemId}/`)
  },

  // Dashboard
  getTodayStats(params = {}) {
    return api.get('/tiktokshop/orders/today_stats/', { params })
  },

  getDashboardStats(params = {}) {
    return api.get('/tiktokshop/orders/dashboard_stats/', { params })
  },
}
