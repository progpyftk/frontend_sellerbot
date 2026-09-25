import { api } from "src/boot/axios";

/**
 * CRUD das despesas personalizáveis do módulo (ticket FINT-9).
 *
 * Por que um service separado do `ContabilService`: aquele é a **camada de leitura** (demonstrativos,
 * apuração, conciliação) e não escreve nada; este é o único lugar do módulo em que a tela **grava**.
 * Misturar os dois faria a régua "a tela não calcula nem escreve" perder o sentido.
 *
 * Contrato do backend (`DespesaLancamentoViewSet`, `ModelViewSet`):
 * - `GET  lancamentos/` devolve `{ lancamentos: [...], resumo: {...} }` — o mesmo contrato do resto
 *   do módulo, com o resumo **separando** o que entra no resultado, o que está fora dele e o que é
 *   dedução da receita;
 * - `POST lancamentos/` cria como `origem="manual"` (o backend força; `planilha` e `recorrente` vêm
 *   das ações próprias de importar e replicar);
 * - `PATCH`/`DELETE lancamentos/<id>/`;
 * - `GET  categorias/` — a categoria é do dono e o casamento por nome é da conciliação, não daqui.
 */
export default {
  /** Lista as despesas do recorte, com o resumo dos totais. */
  getLancamentos(params = {}) {
    return api.get("/api/financeiro/despesas/lancamentos/", { params });
  },

  /** Só os totais do recorte — é o que os cartões usam depois de uma edição. */
  getResumo(params = {}) {
    return api.get("/api/financeiro/despesas/lancamentos/resumo/", { params });
  },

  criarLancamento(payload) {
    return api.post("/api/financeiro/despesas/lancamentos/", payload);
  },

  atualizarLancamento(id, payload) {
    return api.patch(`/api/financeiro/despesas/lancamentos/${id}/`, payload);
  },

  removerLancamento(id) {
    return api.delete(`/api/financeiro/despesas/lancamentos/${id}/`);
  },

  /** As categorias de despesa do dono (com `grupo`, `grupo_rotulo` e `fora_do_resultado`). */
  getCategorias() {
    return api.get("/api/financeiro/despesas/categorias/");
  },
};
