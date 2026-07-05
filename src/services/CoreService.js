import { api } from 'src/boot/axios'

export default {
  getSystemHealth() {
    return api.get('/api/core/health/')
  },

  submitFeedback(data) {
    return api.post('/api/core/feedback/', data)
  },
}
