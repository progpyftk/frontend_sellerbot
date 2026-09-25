import { api } from "src/boot/axios";

/**
 * Leitura do Módulo Financeiro/Contábil (tickets FIN-18/FIN-14).
 *
 * A tela **não calcula nada**: cada método devolve o que o serviço do backend já apurou, com a
 * conferência de cada demonstrativo (`confere`, `equilibra`). O recorte é sempre por
 * `fiscal_account`/`cnpj` e competência (`competencia=AAAA-MM`) ou faixa (`de`/`ate`);
 * `todas_juntas=1` soma o grupo (leitura gerencial — a eliminação intercompany não está feita).
 */
export default {
  /** DRE + Balanço + DFC + estoque de uma vez — é o que a aba "Visão geral" carrega. */
  getResumo(params = {}) {
    return api.get("/api/financeiro/contabil/resumo/", { params });
  },

  getDre(params = {}) {
    return api.get("/api/financeiro/contabil/dre/", { params });
  },

  getBalanco(params = {}) {
    return api.get("/api/financeiro/contabil/balanco/", { params });
  },

  getDfc(params = {}) {
    return api.get("/api/financeiro/contabil/dfc/", { params });
  },

  getBalancete(params = {}) {
    return api.get("/api/financeiro/contabil/balancete/", { params });
  },

  getLancamentos(params = {}) {
    return api.get("/api/financeiro/contabil/lancamentos/", { params });
  },

  getPlanoDeContas(params = {}) {
    return api.get("/api/financeiro/contabil/plano-de-contas/", { params });
  },

  getCompetencias(params = {}) {
    return api.get("/api/financeiro/contabil/competencias/", { params });
  },

  getTributos(params = {}) {
    return api.get("/api/financeiro/contabil/tributos/", { params });
  },

  /** `modelo=2027` troca o eixo para Simples puro × híbrido × fora (ticket TRIB-12). */
  getCenarios(params = {}) {
    return api.get("/api/financeiro/contabil/cenarios/", { params });
  },

  getConciliacao(params = {}) {
    return api.get("/api/financeiro/contabil/conciliacao/", { params });
  },

  getReceitaOficial(params = {}) {
    return api.get("/api/financeiro/contabil/receita-oficial/", { params });
  },

  getBasesDeTempo(params = {}) {
    return api.get("/api/financeiro/contabil/bases-de-tempo/", { params });
  },
};
