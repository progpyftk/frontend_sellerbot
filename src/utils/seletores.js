// Helpers dos seletores de empresa e de período (ticket FIN-22).
//
// Por que existe: o mesmo seletor de CNPJ estava repetido em quatro telas — Margem de
// Contribuição, Balanço fiscal, Documentos fiscais e Nova conexão bancária — cada uma com
// a sua cópia do rótulo e do formatador. Antes de somar o quinto uso (o módulo
// financeiro), o rótulo e as opções passam a sair daqui, e as telas usam
// `SbSeletorEmpresa`/`SbSeletorPeriodo`.
//
// As funções são **puras de propósito**: o teste do frontend roda em ambiente `node`, sem
// DOM, então o que é regra (rótulo, valor, período válido) mora em função testável — não
// dentro do template.

/** `41641514000103` → `41.641.514/0001-03`; devolve `—` quando não há documento. */
export function formatarCnpj(cnpj) {
  if (!cnpj || String(cnpj).length !== 14) return cnpj || "—";
  return String(cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Opções do seletor de empresa a partir da lista de CNPJs do backend.
 *
 * `valor` decide o que o `v-model` guarda: `cnpj` (string, o padrão das telas de leitura —
 * FiscalService devolve o CNPJ) ou `id` (o que a tela de conexões bancárias usa para
 * vincular a conta). `incluirTodos` acrescenta a opção nula ("Todos os CNPJs"), como a tela
 * de documentos fiscais já fazia — a opção nula é o que limpa o filtro.
 */
export function opcoesDeEmpresa(contas, { valor = "cnpj", incluirTodos = false, rotuloTodos = "Todos os CNPJs" } = {}) {
  const opcoes = (contas || []).map((conta) => ({
    label: `${formatarCnpj(conta?.cnpj)} — ${conta?.razao_social || "CNPJ Fiscal"}`,
    value: valor === "id" ? conta?.id : conta?.cnpj,
  }));
  return incluirTodos ? [{ label: rotuloTodos, value: null }, ...opcoes] : opcoes;
}

/**
 * O período é utilizável? `de`/`ate` são competências (`AAAA-MM` ou `AAAA-MM-DD`).
 *
 * Regra do módulo: filtro vazio é "sem recorte" (o backend usa o padrão dele), mas um
 * período **invertido** é erro do usuário e não pode virar "sem filtro" em silêncio —
 * devolve `false` para a tela avisar.
 */
export function periodoValido(de, ate) {
  const inicio = normalizarCompetencia(de);
  const fim = normalizarCompetencia(ate);
  if (!inicio || !fim) return true; // um dos lados vazio = sem recorte
  return inicio <= fim;
}

/** `2026-08` ou `2026-08-15` → `2026-08`; vazio/inválido → `null`. */
export function normalizarCompetencia(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const m = texto.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return `${m[1]}-${m[2]}`;
}
