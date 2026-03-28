import { api } from 'src/boot/axios'

export default {
  getSystemHealth() {
    return api.get('/api/core/health/')
  },
}
