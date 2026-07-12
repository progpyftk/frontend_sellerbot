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
  updateStage(slug, stage) {
    return api.patch(`/api/krivus/clients/${slug}/stage/`, { stage })
  },
  updateLifetime(slug, badge, data = null) {
    return api.patch(`/api/krivus/clients/${slug}/lifetime/`, { badge, data })
  },
  getTimeseries(slug) {
    return api.get(`/api/krivus/clients/${slug}/timeseries/`)
  },
  regenerateToken(slug) {
    return api.post(`/api/krivus/clients/${slug}/regenerate-token/`)
  },
  getPortalData(token) {
    return api.get(`/api/krivus/portal/${token}/`)
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
  documentPdfUrl(clientSlug, documentId) {
    return `/api/krivus/clients/${clientSlug}/documents/${documentId}/pdf/`
  },

  // Invoices (Cobranças)
  getInvoices(clientSlug, statusFilter = null) {
    const params = statusFilter ? { status: statusFilter } : {}
    return api.get(`/api/krivus/clients/${clientSlug}/invoices/`, { params })
  },
  getAllInvoices(statusFilter = null) {
    const params = statusFilter ? { status: statusFilter } : {}
    return api.get('/api/krivus/invoices/', { params })
  },
  createInvoice(clientSlug, data) {
    return api.post(`/api/krivus/clients/${clientSlug}/invoices/`, data)
  },
  markInvoicePaid(clientSlug, invoiceId) {
    return api.post(`/api/krivus/clients/${clientSlug}/invoices/${invoiceId}/mark-paid/`)
  },
  getBillingOverview() {
    return api.get('/api/krivus/billing-overview/')
  },

  // Interações (KRV-9)
  getInteractions(clientSlug) {
    return api.get(`/api/krivus/clients/${clientSlug}/interactions/`)
  },
  createInteraction(clientSlug, data) {
    return api.post(`/api/krivus/clients/${clientSlug}/interactions/`, data)
  },
  deleteInteraction(clientSlug, id) {
    return api.delete(`/api/krivus/clients/${clientSlug}/interactions/${id}/`)
  },

  // Tarefas (KRV-8)
  getTasks(clientSlug, concluida = null) {
    const params = concluida !== null ? { concluida } : {}
    return api.get(`/api/krivus/clients/${clientSlug}/tasks/`, { params })
  },
  createTask(clientSlug, data) {
    return api.post(`/api/krivus/clients/${clientSlug}/tasks/`, data)
  },
  updateTask(clientSlug, id, data) {
    return api.patch(`/api/krivus/clients/${clientSlug}/tasks/${id}/`, data)
  },
  deleteTask(clientSlug, id) {
    return api.delete(`/api/krivus/clients/${clientSlug}/tasks/${id}/`)
  },

  // Alertas (KRV-11)
  getAlerts() {
    return api.get('/api/krivus/alerts/')
  },
}
