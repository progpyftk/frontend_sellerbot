import { api } from "src/boot/axios";
import axios from "axios";

export default {
  /**
   * Consulta consolidada do Balanço de NCMs (quantitativo e financeiro)
   * @param {Object} params { fiscal_account_id, start_date, end_date, ncm, search }
   */
  getNcmBalance(params = {}) {
    return api.get("/api/fiscal/balance/", { params });
  },

  /**
   * Listagem paginada de NF-e com filtros.
   * `search` casa chave/número/participantes e também o título (product_description) dos itens da nota.
   * @param {Object} params { page, page_size, access_key, stock_effect, document_status, ncm, search, fiscal_account }
   */
  /** Exporta o balanço de NCMs filtrado por CNPJ e período em XLSX. */
  exportNcmBalanceExcel(params = {}) {
    return api.get("/api/fiscal/balance/export.xlsx", { params, responseType: "blob" });
  },

  getDocuments(params = {}) {
    return api.get("/api/fiscal/documents/", { params });
  },

  /**
   * Detalhe completo de uma NF-e com itens, impostos, referências e eventos
   */
  getDocumentDetail(documentId) {
    return api.get(`/api/fiscal/documents/${documentId}/`);
  },

  /**
   * Lista de CNPJs fiscais controlados pelo usuário
   */
  getCnpjs() {
    return api.get("/api/fiscal/cnpjs/");
  },

  /** Lista produtos canônicos da normalização métrica. */
  getCanonicalProducts(params = {}) {
    return api.get("/api/fiscal/normalization/canonical-products/", { params });
  },

  /** Cria produto canônico sugerido para revisão. */
  createCanonicalProduct(payload) {
    return api.post("/api/fiscal/normalization/canonical-products/", payload);
  },

  /** Aprova ou rejeita um produto canônico. */
  reviewCanonicalProduct(productId, payload) {
    return api.post(`/api/fiscal/normalization/canonical-products/${productId}/review/`, payload);
  },

  /** Lista aliases da normalização métrica. */
  getProductAliases(params = {}) {
    return api.get("/api/fiscal/normalization/aliases/", { params });
  },

  /** Cria alias em estado sugerido. */
  createProductAlias(payload) {
    return api.post("/api/fiscal/normalization/aliases/", payload);
  },

  /** Aprova ou rejeita um alias. */
  reviewProductAlias(aliasId, payload) {
    return api.post(`/api/fiscal/normalization/aliases/${aliasId}/review/`, payload);
  },

  // ────────────────────────────────────────── NORMALIZAÇÃO MÉTRICA (FB-38 Fases 1+3)

  /** Lista execuções de normalização (runs) com filtros opcionais. */
  getNormalizationRuns(params = {}) {
    return api.get("/api/fiscal/normalization/runs/", { params });
  },

  /** Lista regras de conversão de unidades com filtros de revisão. */
  getNormalizationRules(params = {}) {
    return api.get("/api/fiscal/normalization/rules/", { params });
  },

  /** Aprova ou rejeita uma regra de conversão. */
  reviewNormalizationRule(ruleId, payload) {
    return api.post(`/api/fiscal/normalization/rules/${ruleId}/review/`, payload);
  },

  /** Lista análises de itens normalizados com filtros por run/status/CNPJ/NCM. */
  getNormalizationItems(params = {}) {
    return api.get("/api/fiscal/normalization/items/", { params });
  },

  /** Aprova ou devolve para revisão uma análise de item individual. */
  reviewNormalizationItem(normalizationId, payload) {
    return api.post(`/api/fiscal/normalization/items/${normalizationId}/review/`, payload);
  },

  /**
   * Balanço fiscal métrico (Fase 3): entradas, saídas e saldo por NCM
   * na unidade normalizada aprovada (KG/L/UN), com cobertura e pendências.
   * @param {Object} params { fiscal_account_id, start_date, end_date, ncm, search, normalization_version }
   */
  getNormalizedBalance(params = {}) {
    return api.get("/api/fiscal/balance/normalized/", { params });
  },

  /**
   * Balanço fiscal métrico por SKU (product_code): entradas, saídas e saldo
   * na unidade normalizada (KG/L/UN) + valor financeiro (entradas/saídas em R$).
   * @param {Object} params { fiscal_account_id, start_date, end_date, ncm, search, normalization_version }
   */
  getNormalizedSkuBalance(params = {}) {
    return api.get("/api/fiscal/balance/normalized/sku/", { params });
  },

  /**
   * Lista documentos que necessitam de revisão manual
   */
  getExceptions(params = {}) {
    return api.get("/api/fiscal/exceptions/", { params });
  },

  /**
   * Lista lotes de importação
   */
  getImports(params = {}) {
    return api.get("/api/fiscal/imports/", { params });
  },

  /**
   * Detalhes e progresso de um lote específico
   */
  getImportDetail(batchId) {
    return api.get(`/api/fiscal/imports/${batchId}/`);
  },

  /**
   * Lista de arquivos processados dentro de um lote
   */
  getImportFiles(batchId, params = {}) {
    return api.get(`/api/fiscal/imports/${batchId}/files/`, { params });
  },

  /**
   * Upload multipart direto de arquivos XML avulsos
   */
  uploadFiles(files, onProgress = null) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    return api.post("/api/fiscal/imports/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    });
  },

  /**
   * Solicita URL assinada do GCS para staging de arquivo .ZIP grande
   */
  getStagingUploadUrl(filename, contentType = "application/zip") {
    return api.post("/api/fiscal/staging/upload-url/", {
      filename,
      content_type: contentType,
    });
  },

  /**
   * Envia o arquivo ZIP direto para o Cloud Storage usando a URL assinada
   */
  uploadToStagingUrl(signedUrl, file, contentType = "application/zip", onProgress = null) {
    return axios.put(signedUrl, file, {
      headers: { "Content-Type": contentType },
      onUploadProgress: onProgress,
    });
  },

  /**
   * Notifica o backend para registrar o lote e disparar o processamento em Cloud Tasks
   */
  submitStagingBatch(filename, tempObject) {
    return api.post("/api/fiscal/imports/", {
      filename,
      temp_object: tempObject,
    });
  },
};
