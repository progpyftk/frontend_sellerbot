import { api } from 'src/boot/axios'

const BASE = '/api/core/delivery-carriers/'

export default {
  list() { return api.get(BASE) },
  create(data) { return api.post(BASE, data) },
  update(id, data) { return api.patch(`${BASE}${id}/`, data) },
  remove(id) { return api.delete(`${BASE}${id}/`) },
  listRateTiers(carrierId) { return api.get(`${BASE}${carrierId}/rate-tiers/`) },
  createRateTier(carrierId, data) { return api.post(`${BASE}${carrierId}/rate-tiers/`, data) },
  updateRateTier(carrierId, id, data) { return api.patch(`${BASE}${carrierId}/rate-tiers/${id}/`, data) },
  removeRateTier(carrierId, id) { return api.delete(`${BASE}${carrierId}/rate-tiers/${id}/`) },
}
