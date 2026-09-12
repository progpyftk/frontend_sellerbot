/**
 * Endpoints das superfícies do advisor (PROMO-IA-22).
 *
 * Regra da área: nenhum componente chama a API direto — tudo passa por aqui, com as 4 superfícies
 * separadas (Hoje, Catálogo, Automação e detalhe). Os endpoints reaproveitam os contratos do
 * backend (`/advisor/today/`, `/advisor/catalog/`, `/advisor/automation/`).
 */
import { api } from 'src/boot/axios';

export default {
  /** Superfície Hoje: baldes do dia, proteção, escritas confirmadas, ciclo e política por conta. */
  getToday() {
    return api.get('/mercadolivre/advisor/today/');
  },

  /** Superfície Automação: mesmo contrato do dia, usado para configurar. */
  getAutomation() {
    return api.get('/mercadolivre/advisor/automation/');
  },

  /** PATCH de política: uma conta (auto_write, wave_size, canary_approved, paused) ou todas (pause_all). */
  patchAutomation(payload) {
    return api.patch('/mercadolivre/advisor/automation/', payload);
  },

  /** Superfície Anúncios: linhas por anúncio + facetas (sem as agregações do dia). */
  getCatalog(params = {}) {
    return api.get('/mercadolivre/advisor/catalog/', { params });
  },

  /** Detalhe do anúncio (promoções vivas, timeline do robô, retrato). */
  getItem(itemId) {
    return api.get(`/mercadolivre/promo-overview/${itemId}/`);
  },
};
