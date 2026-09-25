import { api } from "src/boot/axios";

/**
 * Margem de Contribuição materializada (FIN-20).
 *
 * A cascata oficial é:
 *   GMV − impostos = faturamento líquido (net sales)
 *   faturamento líquido − taxas − frete − embalagem − ads − CPV = margem de contribuição
 *   MC % = MC ÷ faturamento líquido × 100
 *
 * O frontend **não recalcula** essa conta: consome o que o backend materializou, para
 * que a régua seja a mesma em todas as telas e conferível contra o contador.
 *
 * Cada linha traz também o veredito da **base de pedidos** (`base_completa`,
 * `cobertura_da_base_pct`, `receita_declarada`): o banco de pedidos não cobre o histórico e,
 * quando o GMV dos pedidos não alcança a receita declarada (a RPA da PGDASD), a MC está
 * **superestimada por falta de pedido** — não é margem pequena.
 */
export default {
  /**
   * Lista as margens materializadas e o resumo do recorte.
   *
   * O `resumo` soma **um único nível** (o mesmo filtro `nivel` aplicado às linhas; sem
   * filtro, o CNPJ). Nunca some `cnpj` + `marketplace` + `sku` — o backend devolve o
   * nível somado em `resumo.nivel_do_resumo` e a contagem de cada nível em
   * `resumo.por_nivel`.
   *
   * No resumo, `receita_declarada` só vem preenchida no nível `cnpj` (é o faturamento da
   * empresa); nos níveis de marketplace/SKU é `null` de propósito — zero seria mentira.
   * `base_completa` é `true` só quando há linha e todas têm base completa.
   *
   * @param {Object} params
   * @param {string} [params.cnpj]            CNPJ (14 dígitos) da empresa
   * @param {number|string} [params.fiscal_account] id da conta fiscal
   * @param {'ml'|'shopee'|'tiktok'} [params.marketplace]
   * @param {string} [params.sku]             vazio = todos os SKUs do canal
   * @param {string} [params.de]              competência inicial (AAAA-MM ou AAAA-MM-DD)
   * @param {string} [params.ate]             competência final (AAAA-MM ou AAAA-MM-DD)
   * @param {'cnpj'|'marketplace'|'sku'} [params.nivel] nível exibido no resumo
   * @returns {Promise<import('axios').AxiosResponse>} `{ margens: [...], resumo: {...} }`
   */
  getMargens(params = {}) {
    return api.get("/api/financeiro/margens/", { params });
  },

  /**
   * As opções do **filtro de produto** da aba de margem (`DRE-23`).
   *
   * Devolve os SKUs que **têm margem no recorte** (`de`/`ate`/`cnpj`/`marketplace`), cada um com o
   * nome como o item foi **vendido** (`{ sku, nome, marketplaces }`) e as contagens de quantos
   * ficaram sem nome. O `sku` já escolhido é ignorado de propósito: a lista precisa continuar
   * permitindo trocar o produto.
   *
   * @param {Object} params mesmos filtros do `getMargens`, sem `sku` e sem `nivel`
   * @returns {Promise<import('axios').AxiosResponse>} `{ produtos: [...], total, com_nome, sem_nome }`
   */
  getProdutos(params = {}) {
    return api.get("/api/financeiro/margens/produtos/", { params });
  },
};
