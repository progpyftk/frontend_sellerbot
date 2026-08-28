import { api } from 'src/boot/axios'

const BASE = '/api/core/product-dimensions/'

export default {
  list() { return api.get(BASE) },
  create(data) { return api.post(BASE, data) },
  update(id, data) { return api.patch(`${BASE}${id}/`, data) },
  remove(id) { return api.delete(`${BASE}${id}/`) },
}
