import { api } from "src/boot/axios";

/**
 * Integração bancária (Financeiro/Contábil).
 *
 * Nenhum endpoint é específico do Banco Inter: a tela descobre os bancos e os
 * campos de credencial em `GET /api/financeiro/bancos/` e monta o formulário a
 * partir de `campos_credencial`. Segredos são write-only — nunca são devolvidos
 * pela API nem registrados em log por este service.
 */
export default {
  /** Lista os bancos suportados e os campos de credencial de cada um. */
  getBancos() {
    return api.get("/api/financeiro/bancos/");
  },

  /** Lista as conexões bancárias do usuário (sem segredos). */
  getConexoes() {
    return api.get("/api/financeiro/conexoes/");
  },

  /**
   * Cria uma conexão bancária (multipart).
   * @param {Object} payload
   * @param {number} payload.fiscal_account
   * @param {string} payload.banco            código do banco (ex: "inter")
   * @param {string} payload.ambiente         ex: "producao" | "homologacao"
   * @param {Object} payload.credenciais      { [nome_do_campo]: valor }
   * @param {File|null} payload.certificado   quando o banco exige certificado
   * @param {string} [payload.senha_certificado]
   */
  criarConexao({
    fiscal_account,
    banco,
    ambiente,
    credenciais = {},
    certificado = null,
    senha_certificado = "",
  }) {
    const formData = new FormData();
    formData.append("fiscal_account", fiscal_account);
    formData.append("banco", banco);
    formData.append("ambiente", ambiente);
    formData.append("credenciais", JSON.stringify(credenciais || {}));
    if (certificado) formData.append("certificado", certificado);
    if (senha_certificado) formData.append("senha_certificado", senha_certificado);
    return api.post("/api/financeiro/conexoes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** Testa a autenticação de uma conexão. Retorna { ok, mensagem, saldo? }. */
  testarConexao(conexaoId) {
    return api.post(`/api/financeiro/conexoes/${conexaoId}/testar/`);
  },

  /** Remove uma conexão bancária. */
  removerConexao(conexaoId) {
    return api.delete(`/api/financeiro/conexoes/${conexaoId}/`);
  },

  /**
   * Sincroniza o extrato de uma conta em um período.
   * @param {number} contaId
   * @param {{data_inicio: string, data_fim: string}} periodo
   */
  sincronizarConta(contaId, { data_inicio, data_fim }) {
    return api.post(`/api/financeiro/contas/${contaId}/sincronizar/`, {
      data_inicio,
      data_fim,
    });
  },

  /**
   * Lista as transações importadas de uma conta no período.
   * @param {Object} params { conta, data_inicio, data_fim, classificacao, ... }
   *   `classificacao` aceita "nao_classificadas", "classificadas" ou um código do plano.
   *   O `resumo` da resposta sempre mede o escopo (conta/período), não o recorte aplicado.
   */
  getTransacoes(params = {}) {
    return api.get("/api/financeiro/transacoes/", { params });
  },

  /**
   * Só o termômetro do extrato (quanto falta classificar), sem carregar as linhas.
   * Aceita os mesmos filtros de `getTransacoes`.
   * @param {Object} params { conta, data_inicio, data_fim, ... }
   */
  getResumoTransacoes(params = {}) {
    return api.get("/api/financeiro/transacoes/resumo/", { params });
  },

  /**
   * O que falta classificar, agrupado pela contraparte — com os `ids` de cada grupo.
   * É o caminho para resolver várias linhas iguais com uma escolha só.
   * Resposta: { grupos: [{ contraparte_*, linhas, valor, tipos, ids, ... }],
   *             contrapartes, linhas, resumo }.
   * @param {Object} params { conta, data_inicio, data_fim, cnpj, busca }
   */
  getPendentesPorContraparte(params = {}) {
    return api.get("/api/financeiro/transacoes/pendentes-por-contraparte/", { params });
  },

  /**
   * Catálogo de categorias do plano de contas, a fonte da lista de classificação.
   * A lista vem do backend para ser a mesma que o motor de classificação usa.
   * Resposta: { categorias: [...], grupos: [{ nome, categorias }] }.
   */
  getCategorias() {
    return api.get("/api/financeiro/categorias/");
  },

  /**
   * Aplica uma mesma categoria a várias transações de uma vez.
   * @param {number[]} ids
   * @param {string} classificacao código do plano ("" limpa a classificação)
   */
  classificarLote(ids, classificacao) {
    return api.post("/api/financeiro/transacoes/classificar-lote/", { ids, classificacao });
  },

  /**
   * Roda a classificação automática sobre as transações já gravadas.
   * @param {boolean} incluirUsuario true também refaz o que o usuário classificou à mão;
   *   false (padrão) preserva a decisão do dono.
   */
  reclassificar(incluirUsuario = false) {
    return api.post("/api/financeiro/transacoes/reclassificar/", {
      incluir_usuario: !!incluirUsuario,
    });
  },

  /**
   * Atualiza a classificação/concilição de uma transação.
   * @param {number} transacaoId
   * @param {{classificacao?: string, conciliado?: boolean}} payload
   */
  atualizarTransacao(transacaoId, payload) {
    return api.patch(`/api/financeiro/transacoes/${transacaoId}/`, payload);
  },

  /**
   * Importa extrato a partir de arquivo OFX/CSV (multipart).
   * @param {number} contaId
   * @param {File} arquivo
   * @param {string} formato  "ofx" | "csv" (vindo de formatos_arquivo do banco)
   */
  importarArquivo(contaId, arquivo, formato) {
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("formato", formato);
    return api.post(`/api/financeiro/contas/${contaId}/importar-arquivo/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
