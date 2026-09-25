// Leitura do livro contábil (ticket FINT-10).
//
// A aba **Livro** é a única do módulo que mostra a **partida** — o lançamento com os débitos e
// créditos que geraram cada número do DRE. O livro é **imutável**: a tela lê, filtra e ordena; a
// correção de um lançamento é **estorno**, nunca edição (invariante do `FINC-1`).
//
// As funções são puras de propósito: o runner de teste do frontend roda em ambiente `node`.

import { paraNumero } from 'src/composables/useOrdenacao';

/** A soma de uma lista de valores em texto (`"1234.56"`) — zero quando não há o que somar. */
export function somar(valores) {
  return (valores || []).reduce((total, valor) => {
    const numero = paraNumero(valor);
    return numero === null ? total : total + numero;
  }, 0);
}

/**
 * Os lançamentos prontos para a tabela: cada um com a **contagem de partidas**, os totais de débito e
 * crédito e a conferência `equilibra` (débito = crédito é a invariante da partida dobrada).
 */
export function linhasDoLivro(lancamentos = []) {
  return (lancamentos || []).map((lancamento) => {
    const partidas = lancamento?.partidas || [];
    const totalDebito = somar(partidas.map((partida) => partida.debito));
    const totalCredito = somar(partidas.map((partida) => partida.credito));
    return {
      ...lancamento,
      partidas,
      quantidade_partidas: partidas.length,
      total_debito: totalDebito,
      total_credito: totalCredito,
      equilibra: Math.round((totalDebito - totalCredito) * 100) === 0,
    };
  });
}

/**
 * Filtro de busca **no cliente** sobre os campos dados.
 *
 * O endpoint do livro não tem `busca` (tem `limite`), então o filtro é da tela — e é de propósito:
 * o dono procura um histórico ou uma referência no que já carregou, sem ida ao servidor a cada tecla.
 */
export function filtrarLivro(linhas = [], termo = '', campos = []) {
  const busca = String(termo ?? '').trim().toLowerCase();
  if (!busca) return linhas || [];
  return (linhas || []).filter((linha) =>
    campos.some((campo) => String(linha?.[campo] ?? '').toLowerCase().includes(busca)),
  );
}

/** As partidas de um lançamento, com chave estável para a tabela do detalhe. */
export function partidasNormalizadas(lancamento = {}) {
  return (lancamento?.partidas || []).map((partida) => ({
    chave: partida.id ?? `${partida.codigo}-${partida.debito}-${partida.credito}`,
    codigo: partida.codigo,
    conta: partida.conta,
    debito: partida.debito,
    credito: partida.credito,
    contraparte_cnpj: partida.contraparte_cnpj,
    centro_custo: partida.centro_custo,
  }));
}
