// Régua de editabilidade e origem do número (ticket FINT-5).
//
// A decisão do dono de 16/09 (sprint `2026-09-16-modulo-financeiro-contabil`, decisão #5) é dura:
// **dado derivado não é editável** — nota, CT-e, NFS-e, Ads, extrato, DAS e lançamento do livro
// entram só por API/importação/livro. O que o dono edita à mão é o dado **nosso**: classificação de
// extrato, despesa personalizável e campo informado de cenário.
//
// Esta régua é a decisão virando código, em função pura testável no ambiente `node` do vitest.
// O vocabulário de origem é o do backend (`JournalEntry.ORIGENS` em `models_contabeis.py`), mais as
// origens do extrato bancário e do cenário — a tela **não inventa** origem.

/**
 * Origens conhecidas. `derivada: true` significa "veio de documento/sistema": a célula mostra a
 * origem, mas **não abre para edição**.
 */
export const ORIGENS = {
  // Livro contábil (JournalEntry.ORIGENS)
  nfe: { rotulo: 'NF-e', variante: 'sky', derivada: true },
  cte: { rotulo: 'CT-e', variante: 'sky', derivada: true },
  nfse: { rotulo: 'NFS-e', variante: 'sky', derivada: true },
  ads: { rotulo: 'Ads', variante: 'amber', derivada: true },
  pedido: { rotulo: 'Pedido', variante: 'indigo', derivada: true },
  folha: { rotulo: 'Folha', variante: 'slate', derivada: true },
  banco: { rotulo: 'Extrato', variante: 'teal', derivada: true },
  ativo: { rotulo: 'Ativo', variante: 'slate', derivada: true },
  depreciacao: { rotulo: 'Depreciação', variante: 'slate', derivada: true },
  das: { rotulo: 'DAS', variante: 'amber', derivada: true },
  // Extrato bancário (app_financeiro: api/ofx/csv)
  api: { rotulo: 'API do banco', variante: 'teal', derivada: true },
  ofx: { rotulo: 'OFX', variante: 'teal', derivada: true },
  csv: { rotulo: 'CSV', variante: 'teal', derivada: true },
  // Derivados de cálculo
  calculado: { rotulo: 'Calculado', variante: 'slate', derivada: true },
  gravado: { rotulo: 'Gravado', variante: 'slate', derivada: true },
  derivado: { rotulo: 'Derivado', variante: 'slate', derivada: true },
  importado: { rotulo: 'Importado', variante: 'slate', derivada: true },
  lei: { rotulo: 'Tabela legal', variante: 'slate', derivada: true },
  // Nosso (a tela pode editar, quando o campo é nosso)
  manual: { rotulo: 'Manual', variante: 'green', derivada: false },
  planilha: { rotulo: 'Planilha', variante: 'green', derivada: false },
  usuario: { rotulo: 'Usuário', variante: 'green', derivada: false },
  // Despesa do dono (`DespesaLancamento.ORIGENS`, FINT-9): `nota` vem de documento, então o valor
  // não se edita à mão; `recorrente` nasce da ação de replicar o mês, que é decisão do dono.
  nota: { rotulo: 'Nota', variante: 'sky', derivada: true },
  recorrente: { rotulo: 'Recorrente', variante: 'green', derivada: false },
};

/** A origem existe? Origem vazia ou desconhecida devolve `null` — quem chama decide o aviso. */
export function origemInfo(origem) {
  const chave = String(origem ?? '').trim().toLowerCase();
  if (!chave) return null;
  return ORIGENS[chave] ? { chave, ...ORIGENS[chave] } : null;
}

/**
 * A origem é derivada? **Desconhecida conta como derivada** — o padrão seguro é não abrir edição
 * para um número cuja procedência a tela não sabe explicar. O erro aparece como "não abre", que é
 * visível, em vez de virar dado corrompido em silêncio.
 */
export function origemDerivada(origem) {
  const info = origemInfo(origem);
  return info ? info.derivada : true;
}

/**
 * A célula é editável? Só quando o campo é **nosso** (`editavel`) e a origem **não** é derivada.
 * Recebe o mesmo objeto que a coluna declara: `{ editavel, origem }`.
 */
export function podeEditar({ editavel = false, origem = '' } = {}) {
  if (!editavel) return false;
  return !origemDerivada(origem);
}

/** Texto do porquê a célula não edita — vira `title`/aviso na tela, nunca um clique que não faz nada. */
export function motivoNaoEditavel(origem) {
  const info = origemInfo(origem);
  if (!info) return 'Origem não informada: a tela não edita o que não sabe de onde veio.';
  if (!info.derivada) return '';
  return `Vem de ${info.rotulo}: entra por importação/livro, não se edita à mão.`;
}

/** O rótulo curto da origem (ou `—`), para tabela densa. */
export function rotuloOrigem(origem) {
  return origemInfo(origem)?.rotulo || '—';
}
