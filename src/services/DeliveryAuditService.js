import { api } from 'src/boot/axios'

export default {
  getAudit(params) { return api.get('/api/core/delivery-audit/', { params }) },
}
