import { api } from 'src/boot/axios'

export default {
  // Overview
  getOverview(days = 30) {
    return api.get('/api/krivus/overview/', { params: { days } })
  },

  // Clients
  getClients() {
    return api.get('/api/krivus/clients/')
  },
  getClient(slug) {
    return api.get(`/api/krivus/clients/${slug}/`)
  },
  createClient(data) {
    return api.post('/api/krivus/clients/', data)
  },
  updateClient(slug, data) {
    return api.patch(`/api/krivus/clients/${slug}/`, data)
  },
  deleteClient(slug) {
    return api.delete(`/api/krivus/clients/${slug}/`)
  },
  getClientStats(slug, days = 30) {
    return api.get(`/api/krivus/clients/${slug}/stats/`, { params: { days } })
  },

  // Milestones
  getMilestones(clientSlug) {
    return api.get(`/api/krivus/clients/${clientSlug}/milestones/`)
  },
  createMilestone(clientSlug, data) {
    return api.post(`/api/krivus/clients/${clientSlug}/milestones/`, data)
  },
  updateMilestone(clientSlug, id, data) {
    return api.patch(`/api/krivus/clients/${clientSlug}/milestones/${id}/`, data)
  },
  deleteMilestone(clientSlug, id) {
    return api.delete(`/api/krivus/clients/${clientSlug}/milestones/${id}/`)
  },

  // Documents
  getDocuments(clientSlug, milestoneId = null) {
    const params = milestoneId ? { milestone: milestoneId } : {}
    return api.get(`/api/krivus/clients/${clientSlug}/documents/`, { params })
  },
  createDocument(clientSlug, data) {
    return api.post(`/api/krivus/clients/${clientSlug}/documents/`, data)
  },
  updateDocument(clientSlug, id, data) {
    return api.patch(`/api/krivus/clients/${clientSlug}/documents/${id}/`, data)
  },
  deleteDocument(clientSlug, id) {
    return api.delete(`/api/krivus/clients/${clientSlug}/documents/${id}/`)
  },

  // Templates
  getTemplates() {
    return api.get('/api/krivus/templates/')
  },
  createTemplate(data) {
    return api.post('/api/krivus/templates/', data)
  },
  updateTemplate(id, data) {
    return api.patch(`/api/krivus/templates/${id}/`, data)
  },
  deleteTemplate(id) {
    return api.delete(`/api/krivus/templates/${id}/`)
  },
  instantiateTemplate(templateId, clientSlug, milestoneId = null) {
    return api.post(`/api/krivus/templates/${templateId}/instantiate/`, {
      client_slug: clientSlug,
      milestone_id: milestoneId,
    })
  },
}
