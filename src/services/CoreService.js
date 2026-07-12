import { api } from 'src/boot/axios'

export default {
  getSystemHealth() {
    return api.get('/api/core/health/')
  },

  submitFeedback(data) {
    // Se for FormData (com anexo de imagem), envia como multipart
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return api.post('/api/core/feedback/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/api/core/feedback/', data)
  },
}
